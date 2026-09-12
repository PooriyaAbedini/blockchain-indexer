import {
  getInclusiveBlockCount,
  getRpcProviderLimits,
  providerAllowsUnfilteredLogs,
} from '#app/core/constants/rpc-provider-limits.js';
import { serviceTokens } from '#app/core/service/service-tokens.js';
import type { ServiceRegistry } from '#app/core/service/service-registry.js';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import type {
  GetETHTransferLogsRequestDto,
  GetETHTransferLogsResponseDto,
  TransactionReceiptDto,
} from './dtos/get-eth-transfer-logs.dto.js';
import type {
  GetETHBlocksByNumberRequestDto,
  GetETHBlocksByNumberResponseDto,
} from './dtos/get-eth-blocks-by-number.js';
import type { GetETHTokenMetadataRequestDto } from './dtos/get-eth-token-metadata.js';
import type { TestHistoricalAutomationRequestDto } from './dtos/historical-automation-test.dto.js';
import type { ParsedTransferLog } from '#app/interfaces/rpc/ethereum/ethereum-logs.js';
import type { ETHTransactionReceipt } from '#app/interfaces/rpc/ethereum/transaction-receipt.js';
import { $Enums } from '#app/database/generated/prisma/client.js';
import type { EthereumBlock } from '#app/interfaces/rpc/ethereum/blocks.js';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {}

  async getETHTransferLogs(
    dto: GetETHTransferLogsRequestDto,
  ): Promise<GetETHTransferLogsResponseDto> {
    const startedAt = Date.now();
    const blockCount = getInclusiveBlockCount(
      BigInt(dto.fromBlock),
      BigInt(dto.toBlock),
    );
    const rpcProvider = this.service.config.get<string>('config.rpcProvider');

    this.logger.log(
      `Request received provider=${rpcProvider} fromBlock=${dto.fromBlock} toBlock=${dto.toBlock} address=${dto.address ?? '(any)'} blocks=${blockCount}`,
    );

    if (dto.toBlock < dto.fromBlock) {
      throw new BadRequestException(
        'toBlock must be greater than or equal to fromBlock',
      );
    }

    if (!dto.address && !providerAllowsUnfilteredLogs(rpcProvider)) {
      throw new BadRequestException(
        'address is required when RPC_PROVIDER=public. Pass a contract address, or use alchemy/ankr and leave address empty (do not type null).',
      );
    }

    try {
      const logs = await this.service.ethereumProvider.getParsedTransferLogs(
        BigInt(dto.fromBlock),
        BigInt(dto.toBlock),
        dto.address,
      );

      let receipts: TransactionReceiptDto[] = [];
      if (dto.addTransactionReceipt) {
        const txnHashes = new Set<string>();
        logs.forEach((log) => {
          txnHashes.add(log.transactionHash);
        });

        const transactionReceipts =
          await this.service.ethereumProvider.getTransactionReceiptBatch([
            ...txnHashes,
          ]);

        // filtering the null responses
        const filteredReceipts = transactionReceipts.filter((a) => a !== null);

        receipts = filteredReceipts;
      }

      this.logger.log(
        `Request completed logs=${logs.length} durationMs=${Date.now() - startedAt}`,
      );

      return {
        logs,
        ...(receipts.length > 0 ? { receipts } : {}),
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Request failed durationMs=${durationMs} error=${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (
        message.toLowerCase().includes('timeout') ||
        message.toLowerCase().includes('timed out')
      ) {
        throw new RequestTimeoutException(
          `RPC eth_getLogs timed out after ${durationMs}ms. Narrow the block range or pass a contract address.`,
        );
      }

      if (
        message.includes('Please specify an address') ||
        message.includes('allnodes.com')
      ) {
        throw new BadRequestException(
          'RPC requires a contract address for eth_getLogs. Pass `address`, or set RPC_PROVIDER to alchemy or ankr.',
        );
      }

      throw error;
    }
  }

  async getETHBlocksByNumber(
    dto: GetETHBlocksByNumberRequestDto,
  ): Promise<GetETHBlocksByNumberResponseDto[]> {
    const startedAt = Date.now();
    const blockCount = getInclusiveBlockCount(
      BigInt(dto.fromBlock),
      BigInt(dto.toBlock),
    );
    const rpcProvider = this.service.config.get<string>('config.rpcProvider');

    this.logger.log(
      `Request received provider=${rpcProvider} fromBlock=${dto.fromBlock} toBlock=${dto.toBlock} blocks=${blockCount}`,
    );

    if (dto.toBlock < dto.fromBlock) {
      throw new BadRequestException(
        'toBlock must be greater than or equal to fromBlock',
      );
    }
    try {
      const blocks = await this.service.ethereumProvider.getBlocksByRange(
        BigInt(dto.fromBlock),
        BigInt(dto.toBlock),
        dto.addTxns,
      );

      this.logger.log(
        `Request completed blocks=${blocks.length} durationMs=${Date.now() - startedAt}`,
      );

      return blocks;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Request failed durationMs=${durationMs} error=${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (
        message.toLowerCase().includes('timeout') ||
        message.toLowerCase().includes('timed out')
      ) {
        throw new RequestTimeoutException(
          `RPC eth_getBlockByNumber timed out after ${durationMs}ms. Narrow the block range.`,
        );
      }
      throw error;
    }
  }

  async getETHTokensMetadata(dto: GetETHTokenMetadataRequestDto) {
    const startedAt = Date.now();
    const rpcProvider = this.service.config.get<string>('config.rpcProvider');

    this.logger.log(
      `Request received provider=${rpcProvider}. Getting metadata for ${dto.addresses.length} tokens`,
    );

    try {
      const metadata = await this.service.ethereumProvider.getTokenMetadataBatch(
        dto.addresses,
      );

      this.logger.log(
        `Request completed fetching metadata durationMs=${Date.now() - startedAt}`,
      );

      return metadata;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Request failed durationMs=${durationMs} error=${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (
        message.toLowerCase().includes('timeout') ||
        message.toLowerCase().includes('timed out')
      ) {
        throw new RequestTimeoutException(
          `RPC timed out after ${durationMs}ms. (static call to multicall3)`,
        );
      }
      throw error;
    }
  }

  async testHistoricalAutomation(dto: TestHistoricalAutomationRequestDto) {
    try {
      // Delete all records we added before first
      // TODO: REMOVE THIS PART WHEN YOU DONE TESTING
      this.logger.log(`Deleting all the data we added before for test`);
      await this.service.repo.block.deleteManyBlocks({
        where: {},
      });
      const provider = this.service.config.get<string>('config.rpcProvider');
      const { maxBatchSize } = getRpcProviderLimits(provider);

      const syncState =
        await this.service.helper.queueHelper.getSyncReportForChain(1);

      this.logger.log(
        `Starting Ethereum Mainnet historical sync.\n Provider: ${provider}\nMax batch request limit: ${maxBatchSize}\nSync State:\n ${JSON.stringify(syncState, null, 2)}`,
      );

      // change the status of historical sync to RUNNING
      await this.service.repo.syncState.updateSyncState({
        where: {
          chain_id: 1,
        },
        data: {
          historical_status: $Enums.SYNC_STATUS.RUNNING,
        },
      });

      // Step 1: Fetch blocks with transactions
      // const currentBlock = syncState.historical_current_block;
      const fromBlock = BigInt(dto.fromBlock);
      const toBlock = BigInt(dto.toBlock);

      this.logger.log(
        `Fetching blocks with transactions...\n(block range: ${fromBlock}-${toBlock})`,
      );
      const blocks: EthereumBlock<true>[] =
        await this.service.ethereumProvider.getBlocksByRange(
          fromBlock,
          toBlock,
          true,
        );

      // Step 2: fetch transaction receipts
      this.logger.log(
        `Fetching transaction receipts...\n(block range: ${fromBlock}-${toBlock})`,
      );
      const transactionHashes = blocks.flatMap((block) =>
        block.transactions.map((txn) => {
          return txn.hash;
        }),
      );
      const receipts: ETHTransactionReceipt[] =
        await this.service.ethereumProvider.getTransactionReceiptBatch(
          transactionHashes,
        );

      // Step 3: fetch transfer logs
      this.logger.log(
        `Fetching parsed transfer logs...\n(block range: ${fromBlock}-${toBlock})`,
      );
      const transferLogs: ParsedTransferLog[] =
        await this.service.ethereumProvider.getParsedTransferLogs(
          fromBlock,
          toBlock,
        );

      // 3-1: exclude token addresses out of transfer logs and fetch metadata for them
      this.logger.log(
        `Excluding token addresses...\n(block range: ${fromBlock}-${toBlock})`,
      );
      const tokenAddresses = new Set<string>();

      transferLogs.forEach((log) => {
        tokenAddresses.add(log.contractAddress);
      });

      this.logger.log(
        `Fetching tokens metadata... \n (block range: ${fromBlock}-${toBlock})`,
      );
      const tokenMetadata =
        await this.service.ethereumProvider.getTokenMetadataBatch(
          Array.from(tokenAddresses),
        );

      const indexingResults = await this.service.helper.queueHelper.indexBlocks(
        toBlock,
        1,
        blocks,
        receipts,
        tokenMetadata,
        transferLogs,
        false,
        $Enums.SYNC_TYPE.HISTORICAL,
      );

      this.logger.log(
        `Indexing results:\n${JSON.stringify(indexingResults, null, 2)}`,
      );

      return blocks;
    } catch (error) {
      this.logger.error(JSON.stringify(error, null, 2));
      throw error;
    }
  }
}
