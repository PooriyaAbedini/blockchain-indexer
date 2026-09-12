import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ServiceRegistry } from '#app/core/service/service-registry.js';
import { serviceTokens } from '#app/core/service/service-tokens.js';
import { $Enums } from '#app/database/generated/prisma/client.js';
import type { EthereumBlock } from '#app/interfaces/rpc/ethereum/blocks.js';
import type { ETHTransactionReceipt } from '#app/interfaces/rpc/ethereum/transaction-receipt.js';

@Injectable()
export class QueueService {
  private readonly logger: Logger = new Logger(QueueService.name);

  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {}

  public async EthereumMainnetHistoricalSync() {
    await this.service.queue.createNewQueue('EthereumMainnetHistoricalSync', {
      removeOnComplete: 100,
      removeOnFail: 100,

      attempts: 3,

      backoff: {
        type: 'exponential',
        delay: 10_000,
      },
    });

    this.service.queue.createNewWorker(
      'EthereumMainnetHistoricalSync',
      'EthereumMainnetHistoricalSync',

      async (job) => {
        const fromBlock = job.data.fromBlock;
        const toBlock = job.data.toBlock;
        try {
          const sequence =
            await this.service.helper.queueHelper.fetchHistoricalSyncSequence(
              1,
              fromBlock,
              toBlock,
            );

          const indexingResults = await this.service.helper.queueHelper.indexBlocks(
            toBlock,
            1,
            sequence.blocks,
            sequence.receipts,
            sequence.tokenMetadata,
            sequence.transferLogs,
            true,
            $Enums.SYNC_TYPE.HISTORICAL,
          );

          this.logger.log(
            `Historical sync completed successfully.\n` +
              `Block range: ${fromBlock}-${toBlock}\n` +
              `Results:\n${JSON.stringify(indexingResults, null, 2)}`,
          );

          // Check if we should add another FIFO job or not:

          // Schedule the next sequence.
          const nextBlockRange =
            await this.service.helper.queueHelper.getNextBlockRange(
              job.data.toBlock,
              job.data.maxBatchSize,
              job.data.sequenceRangeId,
            );

          if (
            nextBlockRange?.fromBlock &&
            nextBlockRange?.toBlock &&
            nextBlockRange?.sequenceRangeId
          ) {
            const newJobId =
              this.service.helper.queueHelper.createHistoricalSyncJobId(
                1,
                nextBlockRange!.fromBlock,
                nextBlockRange!.toBlock,
              );

            await this.service.queue.addFIFOJob(
              'EthereumMainnetHistoricalSync',
              'EthereumMainnetHistoricalSync',
              {
                fromBlock: nextBlockRange!.fromBlock,
                toBlock: nextBlockRange!.toBlock,
                maxBatchSize: job.data.maxBatchSize,
                sequenceRangeId: nextBlockRange.sequenceRangeId,
              },
              newJobId,
            );
          } else {
            this.logger.log(
              'There is no data to add the next historical sync job, putting the historical sysnc into IDLE state ...',
            );

            await this.service.repo.syncState.updateSyncState({
              where: {
                chain_id: 1,
              },
              data: {
                historical_status: $Enums.SYNC_STATUS.IDLE,
              },
            });
          }
        } catch (error) {
          this.logger.error(
            `Historical sync failed.\n` +
              `Job: ${job.id}\n` +
              `Attempt: ${job.attemptsMade + 1}/${job.opts.attempts ?? 1}\n` +
              `Block range: ${fromBlock ?? 'unknown'}-${toBlock ?? 'unknown'}`,
            error instanceof Error ? error.stack : String(error),
          );

          const maxAttempts = job.opts.attempts ?? 1;
          const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

          if (isFinalAttempt) {
            if (fromBlock !== undefined && toBlock !== undefined) {
              await this.service.helper.queueHelper.handleHistoricalSyncGap(
                fromBlock,
                toBlock,
                1,
                error,
              );
            } else {
              this.logger.error(
                `Could not create sync gap because the block range was not determined.`,
              );
            }

            // IMPORTANT:
            // We intentionally don't throw here.
            // The historical sync must continue.
          } else {
            // Throw so BullMQ performs the next retry.
            throw error;
          }

          // Final attempt failed, but we still want the next historical job.
          const nextBlockRange =
            await this.service.helper.queueHelper.getNextBlockRange(
              job.data.toBlock,
              job.data.maxBatchSize,
              job.data.sequenceRangeId,
            );

          if (
            nextBlockRange?.fromBlock &&
            nextBlockRange?.toBlock &&
            nextBlockRange?.sequenceRangeId
          ) {
            const newJobId =
              this.service.helper.queueHelper.createHistoricalSyncJobId(
                1,
                nextBlockRange!.fromBlock,
                nextBlockRange!.toBlock,
              );

            await this.service.queue.addFIFOJob(
              'EthereumMainnetHistoricalSync',
              'EthereumMainnetHistoricalSync',
              {
                fromBlock: nextBlockRange!.fromBlock,
                toBlock: nextBlockRange!.toBlock,
                maxBatchSize: job.data.maxBatchSize,
                sequenceRangeId: nextBlockRange.sequenceRangeId,
              },
              newJobId,
            );
          } else {
            this.logger.log(
              'There is no data to add the next historical sync job, putting the historical sysnc into IDLE state ...',
            );

            await this.service.repo.syncState.updateSyncState({
              where: {
                chain_id: 1,
              },
              data: {
                historical_status: $Enums.SYNC_STATUS.IDLE,
              },
            });
          }

          return {
            skipped: true,
            fromBlock: fromBlock?.toString(),
            toBlock: toBlock?.toString(),
          };
        }
      },
      {
        concurrency: 1,
      },
    );
  }

  public async HistoricalSyncGap() {
    await this.service.queue.createNewQueue('HistoricalSyncGap', {
      removeOnComplete: 100,
      removeOnFail: 100,

      attempts: 3,

      backoff: {
        type: 'exponential',
        delay: 10_000,
      },
    });

    this.service.queue.createNewWorker(
      'HistoricalSyncGap',
      'HistoricalSyncGap',

      async (job) => {
        const { fromBlock, toBlock, gapId, chainId } = job.data;
        try {
          const maxAttempts = job.opts.attempts ?? 1;
          const currentAttempt = job.attemptsMade + 1;

          this.logger.log(
            `Processing historical sync gap ${gapId} ` +
              `(${fromBlock}-${toBlock}) ` +
              `[attempt ${currentAttempt}/${maxAttempts}]`,
          );

          // Mark gap as PROCESSING.
          await this.service.repo.syncGap.updateSyncGap({
            where: {
              id: gapId,
            },
            data: {
              status: $Enums.GAP_STATUS.PROCESSING,
              attempts: {
                increment: 1,
              },
            },
          });

          // Fetch the exact gap range.
          const { blocks, receipts, tokenMetadata, transferLogs } =
            await this.service.helper.queueHelper.fetchHistoricalSyncSequence(
              chainId,
              fromBlock,
              toBlock,
              true,
            );

          // Index the gap.
          //
          // IMPORTANT:
          // updateHistoricalSyncState = false
          //
          // A gap must never move historical_current_block backwards.
          const indexingResults = await this.service.helper.queueHelper.indexBlocks(
            toBlock,
            chainId,
            blocks,
            receipts,
            tokenMetadata,
            transferLogs,
            false,
            $Enums.SYNC_TYPE.HISTORICAL,
          );

          // Mark gap as COMPLETED.
          await this.service.repo.syncGap.updateSyncGap({
            where: {
              id: gapId,
            },
            data: {
              status: $Enums.GAP_STATUS.COMPLETED,
            },
          });

          this.logger.log(
            `Historical sync gap completed successfully: ` +
              `${fromBlock}-${toBlock}`,
          );

          return {
            processed: true,
            gapId,
            fromBlock: fromBlock.toString(),
            toBlock: toBlock.toString(),
            indexingResults,
          };
        } catch (error) {
          const maxAttempts = job.opts.attempts ?? 1;
          const currentAttempt = job.attemptsMade + 1;
          const isFinalAttempt = currentAttempt >= maxAttempts;

          this.logger.error(
            `Historical sync gap failed ` +
              `(attempt ${currentAttempt}/${maxAttempts}).`,
            error instanceof Error ? error.stack : String(error),
          );

          if (isFinalAttempt) {
            await this.service.helper.queueHelper.handleHistoricalSyncGap(
              fromBlock,
              toBlock,
              chainId,
              error,
            );

            await this.service.repo.syncGap.updateSyncGap({
              where: {
                id: gapId,
              },
              data: {
                status: $Enums.GAP_STATUS.FAILED,
              },
            });

            this.logger.error(
              `Historical sync gap permanently failed: ` +
                `${fromBlock}-${toBlock}. ` +
                `The gap requires manual intervention.`,
            );
          }
          throw error;
        }
      },

      {
        concurrency: 1,
      },
    );
  }

  public async SyncGapHandler() {
    await this.service.queue.createNewQueue('SyncGapHandler', {
      removeOnComplete: 1,
      removeOnFail: 100,

      // Scheduler doesn't need retries.
      attempts: 1,
    });

    this.service.queue.createNewWorker(
      'SyncGapHandler',
      'SyncGapHandler',

      async (job) => {
        const gap = await this.service.repo.syncGap.findFirstSyncGap({
          where: {
            chain_id: job.data.chainId,
            status: $Enums.GAP_STATUS.PENDING,
          },
          orderBy: {
            created_at: 'asc',
          },
          select: {
            id: true,
            from_block: true,
            to_block: true,
          },
        });

        if (!gap) {
          this.logger.log(`Found no gaps on chain id: ${job.data.chainId}`);

          return;
        }

        // Prevent future scheduler runs from picking this gap again.
        await this.service.repo.syncGap.updateSyncGap({
          where: {
            id: gap.id,
          },
          data: {
            status: $Enums.GAP_STATUS.QUEUED,
          },
        });

        await this.service.queue.addFIFOJob(
          'HistoricalSyncGap',
          'HistoricalSyncGap',
          {
            fromBlock: gap.from_block,
            toBlock: gap.to_block,
            chainId: job.data.chainId,
            gapId: gap.id,
          },
          `gap-${gap.id}`,
        );

        this.logger.log(
          `Queued gap ${gap.id} (${gap.from_block} -> ${gap.to_block})`,
        );
      },

      {
        concurrency: 1,
      },
    );
  }

  /**
   * IMPORTANT NOTE:
   * This queue is designed to be enqueued by FIFO Jobs ONLY!!
   */
  public async HandleLiveSync() {
    await this.service.queue.createNewQueue('HandleLiveSync', {
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: 5,
    });

    this.service.queue.createNewWorker(
      'HandleLiveSync',
      'HandleLiveSync',
      async (job) => {
        const { blockNumbers, chainId } = job.data;

        /**
         * Since we are using FIFO jobs, it is safe to consider the block with bigger number
         * as the last indexed block. using concurrency is 1 for worker there will be no problem
         */
        const sortedBlockNumbers = blockNumbers.sort(
          (a, b) => (a > b ? -1 : a < b ? 1 : 0), // Desc
        );
        const lastBlock = sortedBlockNumbers[0];

        try {
          const blocks: EthereumBlock<true>[] =
            await this.service.ethereumProvider.getBlocksByNumbers(
              blockNumbers,
              true,
            );

          const transactionHashes = blocks.flatMap((block) =>
            block.transactions.map((txn) => txn.hash),
          );

          const receipts: ETHTransactionReceipt[] =
            await this.service.ethereumProvider.getTransactionReceiptBatch(
              transactionHashes,
            );

          const transferLogs =
            await this.service.ethereumProvider.getParsedTransferLogsByNumbers(
              blockNumbers,
            );

          const tokenAddresses = new Set<string>();

          transferLogs.forEach((log) => {
            tokenAddresses.add(log.contractAddress);
          });

          const tokenMetadata =
            await this.service.ethereumProvider.getTokenMetadataBatch(
              Array.from(tokenAddresses),
            );

          const indexResults = await this.service.helper.queueHelper.indexBlocks(
            lastBlock,
            chainId,
            blocks,
            receipts,
            tokenMetadata,
            transferLogs,
            true,
            $Enums.SYNC_TYPE.LIVE,
          );

          return indexResults;
        } catch (error) {
          this.logger.error(
            `Live sync failed.\n` +
              `Job: ${job.id}\n` +
              `Attempt: ${job.attemptsMade + 1}/${job.opts.attempts ?? 1}\n` +
              `Blocks: ${JSON.stringify(blockNumbers)}`,
            error instanceof Error ? error.stack : String(error),
          );

          await this.service.repo.indexerError.createIndexerError({
            data: {
              error_at: new Date(),
              error: this.service.helper.queueHelper.serializeError(error),
              chain_id: chainId,
              live_blocks: blockNumbers.join(','),
              sync_type: $Enums.SYNC_TYPE.LIVE,
            },
          });

          throw error;
        }
      },
      {
        concurrency: 1,
      },
    );
  }
}
