import { Inject, Injectable, Logger } from '@nestjs/common';
import { serviceTokens } from '#app/core/service/service-tokens.js';
import type { ServiceRegistry } from '#app/core/service/service-registry.js';
import {
  getRpcProviderLimits,
  iterateBlockChunks,
  shouldChunkBlockRange,
} from '#app/core/constants/rpc-provider-limits.js';
import type {
  EthereumLog,
  ParsedTransferLog,
} from '#app/interfaces/rpc/ethereum/ethereum-logs.js';
import { RateLimiter } from '#app/lib/rate-limiter.js';
import {
  Contract,
  FetchRequest,
  Interface,
  type JsonRpcPayload,
  JsonRpcProvider,
  type JsonRpcResult,
  id,
} from 'ethers';
import type { EthereumBlock } from '#app/interfaces/rpc/ethereum/blocks.js';
import type {
  JsonRpcBatchRequest,
  RpcRetryOptions,
} from '../core-helpers/core-helpers.service.js';
import {
  MULTICALL3_ABI,
  MULTICALL3_ADDRESS,
} from '#app/contracts/multicall/multicall3.js';
import { ERC20Interface } from '#app/contracts/interfaces/erc20.interface.js';
import type { ETHTransactionReceipt } from '#app/interfaces/rpc/ethereum/transaction-receipt.js';

const RPC_TIMEOUT_MS = 45_000;
const RPC_MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

export interface TokenMetadata {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
}

@Injectable()
export class EthereumProvider {
  private readonly logger = new Logger(EthereumProvider.name);
  private readonly providerName: string | undefined;
  private readonly provider: JsonRpcProvider;
  private readonly rpcLimits: ReturnType<typeof getRpcProviderLimits>;
  private readonly rateLimiter: RateLimiter | null;
  private readonly TRANSFER_TOPIC = id('Transfer(address,address,uint256)');
  private readonly transferEventInterface = new Interface([
    'event Transfer(address indexed from,address indexed to,uint256 value)',
  ]);

  private readonly BATCH_CONCURRENCY = 3;

  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {
    this.providerName = this.service.config.get<string>('config.rpcProvider');

    this.rpcLimits = getRpcProviderLimits(this.providerName);

    this.rateLimiter = this.rpcLimits.requestsPerMinute
      ? new RateLimiter(this.rpcLimits.requestsPerMinute, RATE_LIMIT_WINDOW_MS)
      : null;

    const rpcUrl = this.service.coreHelpers.getRpcUrl();

    const connection = new FetchRequest(rpcUrl);

    connection.timeout = RPC_TIMEOUT_MS;

    this.provider = new JsonRpcProvider(connection, undefined, {
      staticNetwork: true,
    });

    this.logger.log(
      `RPC ready (provider=${this.providerName}, maxBlockSpan=${this.rpcLimits.maxBlockSpan}, rpm=${this.rpcLimits.requestsPerMinute ?? 'none'}, timeout=${RPC_TIMEOUT_MS}ms, maxAttempts=${RPC_MAX_ATTEMPTS})`,
    );
  }

  public async sendBatchRpc(
    requests: JsonRpcPayload[],
    options: Omit<RpcRetryOptions, 'label'> = {},
  ): Promise<JsonRpcResult[]> {
    const maxAttempts = options.maxAttempts ?? 3;

    return this.service.coreHelpers.withRpcRetry(
      async (attempt) => {
        this.logger.log(`RPC Batch Call, attempt=${attempt}/${maxAttempts}}`);
        return this.provider._send(requests);
      },
      {
        ...options,
        maxAttempts,
      },
    );
  }

  private toHexBlock(block: bigint): string {
    return `0x${block.toString(16)}`;
  }

  private buildGetLogsFilter(
    fromBlock: bigint,
    toBlock: bigint,
    address?: string | null,
  ): {
    fromBlock: string;
    toBlock: string;
    topics: string[];
    address?: string;
  } {
    return {
      fromBlock: this.toHexBlock(fromBlock),
      toBlock: this.toHexBlock(toBlock),
      topics: [this.TRANSFER_TOPIC],
      // eth_getLogs: omit `address` when unset — do not send null
      ...(address ? { address } : {}),
    };
  }

  private buildGetBlocksReqBody(
    fromBlock: bigint,
    toBlock: bigint,
    addTxns: boolean,
  ): JsonRpcBatchRequest[] {
    const length = Number(toBlock - fromBlock + 1n);
    return Array.from({ length }, (_, index) => {
      const blockNumber = fromBlock + BigInt(index);

      return {
        jsonrpc: '2.0',
        id: index + 1,
        method: 'eth_getBlockByNumber',
        params: [`0x${blockNumber.toString(16)}`, addTxns],
      };
    });
  }

  private buildGetBlocksReqBodyByNumbers(
    blockNumbers: bigint[],
    addTxns: boolean,
  ): JsonRpcBatchRequest[] {
    return blockNumbers.map((blockNumber, index) => ({
      jsonrpc: '2.0',
      id: index + 1,
      method: 'eth_getBlockByNumber',
      params: [this.toHexBlock(blockNumber), addTxns],
    }));
  }

  private async acquireRateLimit(): Promise<void> {
    if (!this.rateLimiter) {
      return;
    }
    const startedAt = Date.now();
    await this.rateLimiter.acquire();
    const waitedMs = Date.now() - startedAt;

    if (waitedMs > 0) {
      this.logger.debug(
        `Rate limit wait provider=${this.providerName} waitedMs=${waitedMs}`,
      );
    }
  }

  private async fetchTransferLogs(
    fromBlock: bigint,
    toBlock: bigint,
    address?: string | null,
  ): Promise<EthereumLog[]> {
    const filter = this.buildGetLogsFilter(fromBlock, toBlock, address);

    const startedAt = Date.now();

    this.logger.log(
      `eth_getLogs start from=${fromBlock} to=${toBlock} address=${address ?? '(any)'}`,
    );

    try {
      await this.acquireRateLimit();

      const logs = await this.service.coreHelpers.sendRpc<EthereumLog[]>(
        this.provider,
        'eth_getLogs',
        [filter],
        { maxAttempts: RPC_MAX_ATTEMPTS },
      );

      this.logger.log(
        `eth_getLogs ok from=${fromBlock} to=${toBlock} count=${logs.length} durationMs=${Date.now() - startedAt}`,
      );

      return logs;
    } catch (error) {
      this.logger.error(
        `eth_getLogs failed from=${fromBlock} to=${toBlock} durationMs=${Date.now() - startedAt}`,

        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private async fetchTransferLogsInChunks(
    fromBlock: bigint,
    toBlock: bigint,
    address?: string | null,
  ): Promise<EthereumLog[]> {
    const { maxBlockSpan } = this.rpcLimits;
    const chunks = [...iterateBlockChunks(fromBlock, toBlock, maxBlockSpan)];

    this.logger.log(
      `Block chunking enabled provider=${this.providerName} maxSpan=${maxBlockSpan} chunks=${chunks.length}`,
    );

    const logs: EthereumLog[] = [];

    for (const chunk of chunks) {
      const chunkLogs = await this.fetchTransferLogs(
        chunk.fromBlock,
        chunk.toBlock,
        address,
      );

      logs.push(...chunkLogs);
    }

    return logs;
  }

  public async getParsedTransferLogs(
    fromBlock: bigint,
    toBlock: bigint,
    address?: string | null,
  ): Promise<ParsedTransferLog[]> {
    const startedAt = Date.now();

    this.logger.log(
      `getTransferLogs start provider=${this.providerName} from=${fromBlock} to=${toBlock} address=${address ?? '(any)'} span=${toBlock - fromBlock}`,
    );

    const logs = shouldChunkBlockRange(
      fromBlock,
      toBlock,
      this.rpcLimits.maxBlockSpan,
    )
      ? await this.fetchTransferLogsInChunks(fromBlock, toBlock, address)
      : await this.fetchTransferLogs(fromBlock, toBlock, address);

    this.logger.log(
      `Parsing ${logs.length} raw logs (sample topics[0]=${logs[0]?.topics?.[0] ?? 'n/a'})`,
    );

    const parsedLogs: ParsedTransferLog[] = [];
    let parseFailures = 0;

    for (const log of logs) {
      try {
        const parsedLog = this.transferEventInterface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (!parsedLog) {
          parseFailures += 1;
          continue;
        }

        parsedLogs.push({
          from: String(parsedLog.args.from),
          to: String(parsedLog.args.to),
          value: parsedLog.args.value.toString(),
          contractAddress: log.address,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
        });
      } catch {
        parseFailures += 1;
      }
    }

    this.logger.log(
      `getTransferLogs done raw=${logs.length} parsed=${parsedLogs.length} parseFailures=${parseFailures} durationMs=${Date.now() - startedAt}`,
    );

    return parsedLogs;
  }

  private async fetchBlocks<T extends boolean>(
    fromBlock: bigint,
    toBlock: bigint,
    addTxns: T,
  ): Promise<EthereumBlock<T>[]> {
    const requests = this.buildGetBlocksReqBody(fromBlock, toBlock, addTxns);

    const startedAt = Date.now();

    this.logger.log(
      `eth_getBlockByNumber (batch) start from=${fromBlock} to=${toBlock}`,
    );

    try {
      await this.acquireRateLimit();
      const responses = await this.sendBatchRpc(requests);

      const blocks = responses.map(
        (response) => response.result as EthereumBlock<T>,
      );

      this.logger.log(
        `eth_getBlockByNumber ok from=${fromBlock} to=${toBlock} count=${blocks.length} durationMs=${Date.now() - startedAt}`,
      );

      return blocks;
    } catch (error) {
      this.logger.error(
        `eth_getBlockByNumber failed from=${fromBlock} to=${toBlock} durationMs=${Date.now() - startedAt}`,

        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private async getBlocksByRangeInBatches<T extends boolean>(
    fromBlock: bigint,
    toBlock: bigint,
    addTxns: T,
  ): Promise<EthereumBlock<T>[]> {
    const { maxBatchSize } = this.rpcLimits;
    const batches = [...iterateBlockChunks(fromBlock, toBlock, maxBatchSize)];

    this.logger.log(
      `Block chunking enabled provider=${this.providerName} maxBatchSize=${maxBatchSize} batches=${batches.length}`,
    );

    const blocks: EthereumBlock<T>[] = [];
    for (const batch of batches) {
      const chunkBlocks = await this.fetchBlocks(
        batch.fromBlock,
        batch.toBlock,
        addTxns,
      );

      blocks.push(...chunkBlocks);
    }

    return blocks;
  }

  public async getBlocksByRange<T extends boolean>(
    fromBlock: bigint,
    toBlock: bigint,
    addTxns: boolean,
  ): Promise<EthereumBlock<T>[]> {
    const startedAt = Date.now();

    this.logger.log(
      `getBlocks start provider=${this.providerName} from=${fromBlock} to=${toBlock}`,
    );

    const blocks = shouldChunkBlockRange(
      fromBlock,
      toBlock,
      this.rpcLimits.maxBatchSize,
    )
      ? await this.getBlocksByRangeInBatches(fromBlock, toBlock, addTxns)
      : await this.fetchBlocks(fromBlock, toBlock, addTxns);

    this.logger.log(
      `getBlocks done raw=${blocks.length} durationMs=${Date.now() - startedAt}`,
    );

    return blocks;
  }

  public async getTokenMetadataBatch(
    tokenAddresses: string[],
  ): Promise<TokenMetadata[]> {
    const batches = this.service.coreHelpers.createBatch(tokenAddresses, 100);
    const metadata: TokenMetadata[] = [];

    const multicall = new Contract(
      MULTICALL3_ADDRESS,
      MULTICALL3_ABI,
      this.provider,
    );

    for (const batch of batches) {
      const calls = batch.flatMap((address) => [
        {
          target: address,
          allowFailure: true,
          callData: ERC20Interface.encodeFunctionData('name'),
        },
        {
          target: address,
          allowFailure: true,
          callData: ERC20Interface.encodeFunctionData('symbol'),
        },
        {
          target: address,
          allowFailure: true,
          callData: ERC20Interface.encodeFunctionData('decimals'),
        },
      ]);

      const results = await multicall.aggregate3.staticCall(calls);

      for (let i = 0; i < batch.length; i++) {
        const nameResult = results[i * 3];
        const symbolResult = results[i * 3 + 1];
        const decimalsResult = results[i * 3 + 2];

        let name: string | null = null;
        let symbol: string | null = null;
        let decimals: number | null = null;

        if (nameResult.success && nameResult.returnData !== '0x') {
          try {
            name = ERC20Interface.decodeFunctionResult(
              'name',
              nameResult.returnData,
            )[0];
          } catch (error) {
            this.logger.warn(
              `Failed to decode token name for ${batch[i]}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }

        if (symbolResult.success && symbolResult.returnData !== '0x') {
          try {
            symbol = ERC20Interface.decodeFunctionResult(
              'symbol',
              symbolResult.returnData,
            )[0];
          } catch (error) {
            this.logger.warn(
              `Failed to decode token symbol for ${batch[i]}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }

        if (decimalsResult.success && decimalsResult.returnData !== '0x') {
          try {
            decimals = Number(
              ERC20Interface.decodeFunctionResult(
                'decimals',
                decimalsResult.returnData,
              )[0],
            );
          } catch (error) {
            this.logger.warn(
              `Failed to decode token decimals for ${batch[i]}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }

        metadata.push({
          address: batch[i],
          name,
          symbol,
          decimals,
        });
      }
    }

    return metadata;
  }

  public async getTransactionReceiptBatch(
    txnHashes: string[],
  ): Promise<ETHTransactionReceipt[]> {
    const requests: JsonRpcPayload[] = txnHashes.map((hash, index) => {
      return {
        jsonrpc: '2.0',
        id: index,
        method: 'eth_getTransactionReceipt',
        params: [hash],
      };
    });

    const requestBatches = this.service.coreHelpers.createBatch(
      requests,
      this.rpcLimits.maxBatchSize,
    );

    const startedAt = Date.now();

    this.logger.log(
      `started eth_getTransactionReceipt (batch) for ${txnHashes.length} transactions`,
    );

    const receipts: ETHTransactionReceipt[] = [];

    try {
      for (let i = 0; i < requestBatches.length; i += this.BATCH_CONCURRENCY) {
        const batchGroup = requestBatches.slice(i, i + this.BATCH_CONCURRENCY);

        const responses = await Promise.all(
          batchGroup.map(async (batch) => {
            await this.acquireRateLimit();

            return this.provider._send(batch);
          }),
        );

        for (const response of responses) {
          receipts.push(...response.map((item) => item.result));
        }
      }

      this.logger.log(
        `eth_getTransactionReceipt (batch) for ${txnHashes.length} transactions durationMs=${Date.now() - startedAt}`,
      );

      return receipts;
    } catch (error) {
      this.logger.error(
        `eth_getTransactionReceipt (batch) failed for ${txnHashes.length} transactions durationMs=${Date.now() - startedAt}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  public async getCurrentBlock<T extends boolean>(
    addTxns: T,
  ): Promise<EthereumBlock<T>> {
    const currentBlock = await this.service.coreHelpers.sendRpc<EthereumBlock<T>>(
      this.provider,
      'eth_getBlockByNumber',
      ['latest', addTxns],
    );

    return currentBlock;
  }

  private async fetchBlocksByNumbers<T extends boolean>(
    blockNumbers: bigint[],
    addTxns: T,
  ): Promise<EthereumBlock<T>[]> {
    if (blockNumbers.length === 0) {
      return [];
    }

    const batches = this.service.coreHelpers.createBatch(
      blockNumbers,
      this.rpcLimits.maxBatchSize,
    );

    this.logger.log(
      `eth_getBlockByNumber (batch by numbers) start blocks=${blockNumbers.length} batches=${batches.length}`,
    );

    const blocks: EthereumBlock<T>[] = [];

    for (const batch of batches) {
      const requests = this.buildGetBlocksReqBodyByNumbers(batch, addTxns);

      await this.acquireRateLimit();

      const responses = await this.sendBatchRpc(requests);

      const batchBlocks = responses.map(
        (response) => response.result as EthereumBlock<T>,
      );

      blocks.push(...batchBlocks);
    }

    this.logger.log(
      `eth_getBlockByNumber (batch by numbers) done blocks=${blocks.length}`,
    );

    return blocks;
  }

  public async getBlocksByNumbers<T extends boolean>(
    blockNumbers: bigint[],
    addTxns: T,
  ): Promise<EthereumBlock<T>[]> {
    const startedAt = Date.now();

    this.logger.log(
      `getBlocksByNumbers start provider=${this.providerName} blocks=${blockNumbers.length}`,
    );

    const blocks = await this.fetchBlocksByNumbers(blockNumbers, addTxns);

    this.logger.log(
      `getBlocksByNumbers done raw=${blocks.length} durationMs=${Date.now() - startedAt}`,
    );

    return blocks;
  }

  private async fetchTransferLogsByNumbers(
    blockNumbers: bigint[],
    address?: string | null,
  ): Promise<EthereumLog[]> {
    if (blockNumbers.length === 0) {
      return [];
    }

    const logs: EthereumLog[] = [];

    this.logger.log(
      `eth_getLogs by numbers start blocks=${blockNumbers.length} address=${address ?? '(any)'}`,
    );

    for (const blockNumber of blockNumbers) {
      const blockLogs = await this.fetchTransferLogs(
        blockNumber,
        blockNumber,
        address,
      );

      logs.push(...blockLogs);
    }

    this.logger.log(
      `eth_getLogs by numbers done blocks=${blockNumbers.length} logs=${logs.length}`,
    );

    return logs;
  }

  public async getParsedTransferLogsByNumbers(
    blockNumbers: bigint[],
    address?: string | null,
  ): Promise<ParsedTransferLog[]> {
    const startedAt = Date.now();

    this.logger.log(
      `getTransferLogsByNumbers start provider=${this.providerName} blocks=${blockNumbers.length} address=${address ?? '(any)'}`,
    );

    const logs = await this.fetchTransferLogsByNumbers(blockNumbers, address);

    this.logger.log(`Parsing ${logs.length} raw logs`);

    const parsedLogs: ParsedTransferLog[] = [];
    let parseFailures = 0;

    for (const log of logs) {
      try {
        const parsedLog = this.transferEventInterface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (!parsedLog) {
          parseFailures += 1;
          continue;
        }

        parsedLogs.push({
          from: String(parsedLog.args.from),
          to: String(parsedLog.args.to),
          value: parsedLog.args.value.toString(),
          contractAddress: log.address,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
        });
      } catch {
        parseFailures += 1;
      }
    }

    this.logger.log(
      `getTransferLogsByNumbers done raw=${logs.length} parsed=${parsedLogs.length} parseFailures=${parseFailures} durationMs=${Date.now() - startedAt}`,
    );

    return parsedLogs;
  }

  // public async getTransactionReceiptBatch(txnHashes: string[]) {}

  // public async getTransaction(transactionHash)
}
