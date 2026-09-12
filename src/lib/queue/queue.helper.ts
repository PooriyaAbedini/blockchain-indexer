import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ServiceRegistry } from '#app/core/service/service-registry.js';
import { serviceTokens } from '#app/core/service/service-tokens.js';
import type { Repository } from '#app/database/repositoryRegistry.js';
import type { EthereumBlock } from '#app/interfaces/rpc/ethereum/blocks.js';
import {
  $Enums,
  Prisma,
  TRANSACTION_STATUS,
} from '#app/database/generated/prisma/client.js';
import type { ETHTransactionReceipt } from '../../interfaces/rpc/ethereum/transaction-receipt.js';
import type { ParsedTransferLog } from '#app/interfaces/rpc/ethereum/ethereum-logs.js';
import type { TokenMetadata } from '#app/global/modules/ethereum-provider/ethereum-provider.service.js';
import type { Context } from '#app/interfaces/context.js';
import { chainById, type ChainId } from '#app/core/constants/chains.js';

@Injectable()
export class QueueHelper {
  private readonly logger: Logger = new Logger(QueueHelper.name);

  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {}

  async getSyncReportForChain(chainId: ChainId) {
    let syncState: {
      historical_current_block: bigint | null;
      historical_status: $Enums.SYNC_STATUS;
      live_current_block: bigint | null;
      live_status: $Enums.SYNC_STATUS;
      live_started_at: bigint | null;
      created_at: Date | null;
      updated_at: Date | null;
      chain_id: number;
    } | null;
    // make sure we have ethereum mainnet chain in db
    const chain = await this.service.repo.chain.findUniqueChain({
      where: {
        id: chainId,
      },
      include: {
        sync_state: true,
      },
    });

    if (!chain) {
      const chainInfo = chainById[chainId];
      if (!chainInfo) {
        throw new Error('Invalid chain in getSyncReportForChain method!');
      }
      await this.service.repo.chain.createChain({
        data: {
          id: chainId,
          name: chainInfo.name,
          slug: chainInfo.slug,
        },
      });
    }

    // Check if we have added any sync state before
    syncState = await this.service.repo.syncState.findUniqueSyncState({
      where: {
        chain_id: chainId,
      },
    });

    if (!syncState) {
      syncState = await this.service.repo.syncState.createSyncState({
        data: {
          chain_id: chainId,
        },
      });
    }

    return syncState;
  }

  async processBlocksWithTransactions(
    blocks: EthereumBlock<true>[],
    chain_id: ChainId,
    ctx?: Context,
  ) {
    // add blocks and transactions to db:
    const transformedBlocks: Prisma.blockCreateManyInput[] = blocks.map((block) => ({
      chain_id,

      number: BigInt(block.number),
      hash: block.hash,
      parent_hash: block.parentHash,
      timestamp: new Date(parseInt(block.timestamp, 16) * 1000),

      transaction_count: block.transactions.length,

      gas_limit: new Prisma.Decimal(BigInt(block.gasLimit).toString()),
      gas_used: new Prisma.Decimal(BigInt(block.gasUsed).toString()),

      base_fee_per_gas:
        block.baseFeePerGas !== null
          ? new Prisma.Decimal(BigInt(block.baseFeePerGas).toString())
          : null,

      miner: block.miner,
      state_root: block.stateRoot,
      transactions_root: block.transactionsRoot,
      receipts_root: block.receiptsRoot,

      size: BigInt(block.size),
      difficulty: new Prisma.Decimal(BigInt(block.difficulty).toString()),
      logs_bloom: block.logsBloom,
    }));

    const transformedTransactions: Prisma.transactionCreateManyInput[] =
      blocks.flatMap((block) =>
        block.transactions.map((txn) => ({
          chain_id,

          hash: txn.hash,
          block_number: BigInt(block.number),
          transaction_index: BigInt(txn.transactionIndex),

          from: txn.from,
          to: txn.to,

          nonce: BigInt(txn.nonce),
          value: new Prisma.Decimal(BigInt(txn.value).toString()),

          gas_price:
            txn.type === '0x0' || txn.type === '0x1'
              ? new Prisma.Decimal(BigInt(txn.gasPrice).toString())
              : null,

          max_fee_per_gas:
            txn.type === '0x2' || txn.type === '0x3' || txn.type === '0x4'
              ? new Prisma.Decimal(BigInt(txn.maxFeePerGas).toString())
              : null,

          max_priority_fee_per_gas:
            txn.type === '0x2' || txn.type === '0x3' || txn.type === '0x4'
              ? new Prisma.Decimal(BigInt(txn.maxPriorityFeePerGas).toString())
              : null,

          max_fee_per_blob_gas:
            txn.type === '0x3'
              ? new Prisma.Decimal(BigInt(txn.maxFeePerBlobGas).toString())
              : null,

          input: txn.input,
          type: txn.type,

          // Will be updated after receipt indexing
          status: TRANSACTION_STATUS.PENDING,
        })),
      );

    const insertBlocksresult = await this.service.repo.block.createManyBlocks(
      {
        data: transformedBlocks,
        skipDuplicates: true,
      },
      ctx,
    );

    const inserteransactionsresult =
      await this.service.repo.transaction.createManyTransactions(
        {
          data: transformedTransactions,
          skipDuplicates: true,
        },
        ctx,
      );

    return {
      blocksCount: transformedBlocks.length,
      transactionsCount: transformedTransactions.length,
      insertedBlocks: insertBlocksresult.count,
      insertedTransactions: inserteransactionsresult.count,
    };
  }

  async processTxnReceipts(
    receipts: ETHTransactionReceipt[],
    chainId: ChainId,
    ctx?: Context,
  ) {
    // if receipt is null then transaction has not been mined yet, so we should handle it in live sync
    const nonNullReceipts = receipts.filter((receipt) => receipt !== null);
    const transformedReceipts: Prisma.txn_receiptCreateManyInput[] =
      nonNullReceipts.map((receipt) => ({
        chain_id: chainId,
        transaction_hash: receipt.transactionHash,
        contract_address: receipt.contractAddress,
        cumulative_gas_used: new Prisma.Decimal(
          BigInt(receipt.cumulativeGasUsed).toString(),
        ),
        effective_gas_price: new Prisma.Decimal(
          BigInt(receipt.effectiveGasPrice).toString(),
        ),
        from: receipt.from,
        gas_used: new Prisma.Decimal(BigInt(receipt.gasUsed).toString()),
        logs_bloom: receipt.logsBloom,
        to: receipt.to,
        type: receipt.to,
      }));

    const transformedLogs: Prisma.txn_receipt_logCreateManyInput[] =
      nonNullReceipts.flatMap((receipt) =>
        receipt.logs.map((log) => ({
          chain_id: chainId,
          transaction_hash: log.transactionHash,
          address: log.address,
          topics: log.topics.join(','),
          data: log.data,
          logIndex: BigInt(log.logIndex),
          removed: log.removed,
        })),
      );

    const insertReceiptsresult =
      await this.service.repo.transactionReceipt.createManyReceipts(
        {
          data: transformedReceipts,
          skipDuplicates: true,
        },
        ctx,
      );

    const insertLogsresult =
      await this.service.repo.transactionReceipt.createManyReceiptLogs(
        {
          data: transformedLogs,
          skipDuplicates: true,
        },
        ctx,
      );

    return {
      receiptsCount: receipts.length,
      logsCount: transformedLogs.length,
      insertedReceipts: insertReceiptsresult.count,
      insertedLogs: insertLogsresult.count,
    };
  }

  async processTransferLogs(
    logs: ParsedTransferLog[],
    chainId: ChainId,
    ctx?: Context,
  ) {
    const transformedLogs: Prisma.token_transferCreateManyInput[] = logs.map(
      (log) => ({
        chain_id: chainId,
        tx_hash: log.transactionHash,
        log_index: BigInt(log.logIndex),
        from: log.from,
        to: log.to,
        value: new Prisma.Decimal(BigInt(log.value).toString()),
        block_number: BigInt(log.blockNumber),
        token_address: log.contractAddress,
      }),
    );

    const result = await this.service.repo.tokenTransfer.createManyTokenTransfers(
      { data: transformedLogs, skipDuplicates: true },
      ctx,
    );

    return {
      transferLogsCount: logs.length,
      insertedTransferLogs: result.count,
    };
  }

  async processTokenMetadata(
    metadata: TokenMetadata[],
    chainId: number,
    ctx?: Context,
  ) {
    const transformedMetadata: Prisma.tokenCreateManyInput[] = metadata.map(
      (data) => ({
        chain_id: chainId,
        address: data.address,
        symbol: data.symbol,
        name: data.name,
        decimals: data.decimals,
      }),
    );

    const result = await this.service.repo.token.createManyTokens(
      {
        data: transformedMetadata,
        skipDuplicates: true,
      },
      ctx,
    );

    return {
      metadataCount: metadata.length,
      insertedTokens: result.count,
    };
  }

  async indexBlocks(
    lastIndexed: bigint,
    chainId: ChainId,
    blocks: EthereumBlock<true>[],
    receipts: ETHTransactionReceipt[],
    tokenMetadata: TokenMetadata[],
    transferLogs: ParsedTransferLog[],
    updateSyncState = true,
    syncType: $Enums.SYNC_TYPE,
  ) {
    try {
      return await this.service.transaction.start(async (ctx) => {
        this.logger.log(`Indexing blocks with transactions...`);
        const blocksResult = await this.processBlocksWithTransactions(
          blocks,
          chainId,
          ctx,
        );

        this.logger.log(`Indexing receipts...`);
        const receiptsResult = await this.processTxnReceipts(receipts, chainId, ctx);

        this.logger.log(`Indexing tokens...`);
        const metadataResult = await this.processTokenMetadata(
          tokenMetadata,
          chainId,
          ctx,
        );

        this.logger.log(`Indexing transfer logs...`);
        const transfersResult = await this.processTransferLogs(
          transferLogs,
          chainId,
          ctx,
        );

        // update sync state here if it is a main historical sync process
        if (updateSyncState) {
          this.logger.log(`Updating sync state...`);
          await this.service.repo.syncState.updateSyncState({
            where: {
              chain_id: chainId,
            },
            data:
              syncType === $Enums.SYNC_TYPE.HISTORICAL
                ? {
                    historical_current_block: lastIndexed,
                    historical_status: $Enums.SYNC_STATUS.RUNNING,
                  }
                : {
                    live_current_block: lastIndexed,
                    live_status: $Enums.SYNC_STATUS.RUNNING,
                  },
          });
        }

        return {
          blocksResult,
          receiptsResult,
          metadataResult,
          transfersResult,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Error on indexBlocks: ${message}`, stack);

      throw error;
    }
  }

  async fetchHistoricalSyncSequence(
    chainId: ChainId,
    fromBlock: bigint,
    toBlock: bigint,
    gapSync: boolean = false,
  ) {
    const provider = this.service.config.get<string>('config.rpcProvider');

    const syncState = await this.getSyncReportForChain(chainId);

    this.logger.log(
      `Starting Ethereum Mainnet ${gapSync ? 'gap sync' : 'historical sync'}.\n` +
        `Provider: ${provider}\n` +
        `From Block: ${fromBlock} To Block: ${toBlock}\n` +
        `Sync State:\n${JSON.stringify(syncState, null, 2)}`,
    );

    // change the status of historical sync to RUNNING if it is not a gap sync
    if (!gapSync) {
      await this.service.repo.syncState.updateSyncState({
        where: {
          chain_id: chainId,
        },
        data: {
          historical_status: $Enums.SYNC_STATUS.RUNNING,
        },
      });
    }

    // Step 1: Fetch blocks with transactions
    this.logger.log(
      `[${gapSync ? 'GAP SYNC' : 'HISTORICAL SYNC'}] ` +
        `Fetching blocks with transactions...\n` +
        `(block range: ${fromBlock}-${toBlock})`,
    );

    const blocks: EthereumBlock<true>[] =
      await this.service.ethereumProvider.getBlocksByRange(fromBlock, toBlock, true);

    // Step 2: fetch transaction receipts
    this.logger.log(
      `[${gapSync ? 'GAP SYNC' : 'HISTORICAL SYNC'}] ` +
        `Fetching transaction receipts...\n` +
        `(block range: ${fromBlock}-${toBlock})`,
    );

    const transactionHashes = blocks.flatMap((block) =>
      block.transactions.map((txn) => txn.hash),
    );

    const receipts: ETHTransactionReceipt[] =
      await this.service.ethereumProvider.getTransactionReceiptBatch(
        transactionHashes,
      );

    // Step 3: fetch transfer logs
    this.logger.log(
      `[${gapSync ? 'GAP SYNC' : 'HISTORICAL SYNC'}] ` +
        `Fetching parsed transfer logs...\n` +
        `(block range: ${fromBlock}-${toBlock})`,
    );

    const transferLogs: ParsedTransferLog[] =
      await this.service.ethereumProvider.getParsedTransferLogs(fromBlock, toBlock);

    // 3-1: exclude token addresses out of transfer logs and fetch metadata for them
    this.logger.log(
      `[${gapSync ? 'GAP SYNC' : 'HISTORICAL SYNC'}] ` +
        `Excluding token addresses...\n` +
        `(block range: ${fromBlock}-${toBlock})`,
    );

    const tokenAddresses = new Set<string>();

    transferLogs.forEach((log) => {
      tokenAddresses.add(log.contractAddress);
    });

    this.logger.log(
      `[${gapSync ? 'GAP SYNC' : 'HISTORICAL SYNC'}] ` +
        `Fetching token metadata...\n` +
        `(block range: ${fromBlock}-${toBlock})`,
    );

    const tokenMetadata = await this.service.ethereumProvider.getTokenMetadataBatch(
      Array.from(tokenAddresses),
    );

    return {
      fromBlock,
      toBlock,
      blocks,
      receipts,
      tokenMetadata,
      transferLogs,
    };
  }

  async handleHistoricalSyncGap(
    fromBlock: bigint,
    toBlock: bigint,
    chainId: ChainId,
    error: unknown,
  ) {
    return this.service.transaction.start(async (ctx) => {
      const syncGap = await this.service.repo.syncGap.upsertSyncGap(
        {
          where: {
            chain_id_from_block_to_block: {
              chain_id: chainId,
              from_block: fromBlock,
              to_block: toBlock,
            },
          },
          create: {
            chain_id: chainId,
            from_block: fromBlock,
            to_block: toBlock,
            status: $Enums.GAP_STATUS.PENDING,
          },
          update: {},
          select: {
            id: true,
          },
        },
        ctx,
      );

      await this.service.repo.indexerError.createIndexerError(
        {
          data: {
            error_at: new Date(),
            error: this.serializeError(error),
            chain_id: chainId,
            sync_gap_id: syncGap.id,
            sync_type: $Enums.SYNC_TYPE.HISTORICAL,
          },
        },
        ctx,
      );

      return syncGap;
    });
  }

  public serializeError(error: unknown): string {
    if (error instanceof Error) {
      return JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  async getNextBlockRange(
    toBlock: bigint,
    maxBlockSpan: bigint,
    sequenceRangeId: string,
  ): Promise<{
    fromBlock: bigint | null;
    toBlock: bigint | null;
    sequenceRangeId: string | null;
  } | null> {
    let sequence =
      await this.service.repo.historicalSyncRange.findUniqueHistoricalSyncRange({
        where: {
          id: sequenceRangeId,
        },
      });

    if (!sequence) {
      throw new Error('There is no sequence with this id for historical sync');
    }

    let nextSeqRangeId: string | null = sequenceRangeId;
    const seqToBlock: bigint | null = sequence!.to_block;
    const nextFromBlock: bigint | null = toBlock + 1n;

    if (seqToBlock === toBlock) {
      // we should move to next sequence or historical sync process is completed
      // update current sequence status to finalized
      await this.service.repo.historicalSyncRange.updateHistoricalSyncRange({
        where: {
          id: sequenceRangeId,
        },
        data: {
          status: $Enums.HISTORICAL_RANGE_STATUS.FINALIZED,
        },
      });

      sequence =
        await this.service.repo.historicalSyncRange.findFirstHistoricalSyncRange({
          where: {
            status: $Enums.HISTORICAL_RANGE_STATUS.PENDING,
          },
          orderBy: {
            created_at: 'asc',
          },
        });

      if (!sequence) {
        // It means we've fetched historical sequences
        return {
          fromBlock: null,
          toBlock: null,
          sequenceRangeId: null,
        };
      }

      nextSeqRangeId = sequence.id;
    }

    let nextToBlock: bigint | null = null;

    if (nextFromBlock + maxBlockSpan - 1n >= sequence.to_block) {
      nextToBlock = sequence.to_block;
    } else {
      nextToBlock = nextFromBlock + maxBlockSpan - 1n;
    }

    return {
      fromBlock: nextFromBlock,
      toBlock: nextToBlock,
      sequenceRangeId: nextSeqRangeId,
    };
  }

  createLiveSyncJobId(chainId: ChainId, blocks: bigint[]) {
    return `handle-live-sync-${chainId}-${JSON.stringify(blocks)}-${new Date()}`;
  }

  createHistoricalSyncJobId(chainId: ChainId, fromBlock: bigint, toBlock: bigint) {
    return `historical-${chainId}-${fromBlock}-${toBlock}-${new Date()}`;
  }
}
