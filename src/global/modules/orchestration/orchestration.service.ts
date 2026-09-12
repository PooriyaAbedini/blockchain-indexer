import { getRpcProviderLimits } from '#app/core/constants/rpc-provider-limits.js';
import { serviceTokens } from '#app/core/service/service-tokens.js';
import type { ServiceRegistry } from '#app/core/service/service-registry.js';
import { $Enums } from '#app/database/generated/prisma/client.js';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import type { ChainId } from '#app/core/constants/chains.js';

@Injectable()
export class OrchestrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrchestrationService.name);
  private firstLiveBlock: bigint | null = null;

  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {}

  async onApplicationBootstrap() {
    // 1. Create chains
    await this.service.helper.orchestrationHelper.addValidChains();
    this.logger.log('Valid chains added!');
    // 2. Create queues/workers.
    await this.service.queueService.HandleLiveSync();
    await this.service.queueService.EthereumMainnetHistoricalSync();
    await this.service.queueService.HistoricalSyncGap();
    await this.service.queueService.SyncGapHandler();
    this.logger.log('Queues are up and running!');

    // 3. Initialize live sync
    await this.initiateLiveSync(1);

    // 4. Recover database state from an interrupted application.
    await this.recoverGaps();

    // 5. Reconcile BullMQ with PostgreSQL.
    await this.reconcileHistoricalSync();
    await this.reconcileSyncGapHandler();

    this.logger.log('Job orchestration bootstrap completed.');
  }

  /**
   * PostgreSQL is the source of truth for historical progress.
   *
   * If a historical job is already waiting/active/delayed,
   * we leave it alone.
   *
   * If no job exists, we enqueue the next range based on
   * historical_current_block.
   */
  private async reconcileHistoricalSync() {
    const queue = this.service.queue.checkQueueExistence(
      'EthereumMainnetHistoricalSync',
    );

    if (!queue) {
      throw new Error('EthereumMainnetHistoricalSync queue does not exist.');
    }

    const provider = this.service.config.get<string>('config.rpcProvider');
    const { maxBatchSize } = getRpcProviderLimits(provider);

    const { fromBlock, toBlock, sequenceRangeId } =
      await this.service.helper.orchestrationHelper.getFirstHistoricalRangeToStart(
        1,
        BigInt(maxBatchSize),
      );

    if (fromBlock === null || toBlock === null) {
      // Historical sync is completed before
      return;
    }

    const jobId = `historical-${fromBlock.toString()}-${toBlock.toString()}`;

    /*
     * IMPORTANT:
     *
     * Check whether this exact job already exists in BullMQ.
     *
     * If it does, don't enqueue another one.
     */
    const existingJob = await queue.getJob(jobId);

    if (existingJob) {
      this.logger.log(
        `Historical sync job already exists: ${jobId}. ` +
          `Status will be handled by BullMQ.`,
      );

      return;
    }

    await this.service.queue.addFIFOJob(
      'EthereumMainnetHistoricalSync',
      'EthereumMainnetHistoricalSync',
      {
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        maxBatchSize: maxBatchSize.toString(),
        sequenceRangeId,
      },
      jobId,
    );

    this.logger.log(`Reconciled historical sync. Queued ${fromBlock}-${toBlock}.`);
  }

  private async reconcileSyncGapHandler() {
    const queue = this.service.queue.checkQueueExistence('SyncGapHandler');

    if (!queue) {
      throw new Error('SyncGapHandler queue does not exist.');
    }

    const repeatableJobs =
      await this.service.queue.getRepeatableJobs('SyncGapHandler');

    const expectedInterval = 1000 * 60 * 5;

    const schedulerExists = repeatableJobs.some(
      (job) => job.every === expectedInterval,
    );

    if (schedulerExists) {
      this.logger.log('SyncGapHandler scheduler already exists.');

      return;
    }

    await this.service.queue.addRepeatableJob(
      'SyncGapHandler',
      'SyncGapHandler',
      {
        every: expectedInterval,
      },
      {
        chainId: 1,
      },
    );

    this.logger.log('SyncGapHandler scheduler was created.');
  }

  /**
   * Recover database state left behind by a crashed process.
   *
   * PROCESSING means the worker started processing the gap but
   * didn't finish it.
   *
   * QUEUED means the gap was claimed for BullMQ but we don't
   * know whether the enqueue actually completed.
   *
   * Both are safe to retry because gap indexing is supposed
   * to be idempotent.
   */
  private async recoverGaps() {
    const queue = this.service.queue.checkQueueExistence('HistoricalSyncGap');

    if (!queue) {
      throw new Error('HistoricalSyncGap queue does not exist.');
    }

    const result = await this.service.repo.syncGap.updateManySyncGap({
      where: {
        status: {
          in: [$Enums.GAP_STATUS.QUEUED, $Enums.GAP_STATUS.PROCESSING],
        },
      },
      data: {
        status: $Enums.GAP_STATUS.PENDING,
      },
    });
    this.logger.log(`Recovered ${result.count} interrupted sync gaps.`);
  }

  /**
   * This method fetches the current block and handles the historical block ranges setup
   * NOTE:we always keep our indexer one block behind the head
   */

  private async initiateLiveSync(chainId: ChainId) {
    const currentBlock = await this.service.ethereumProvider.getCurrentBlock(false);
    this.firstLiveBlock = BigInt(currentBlock.number) - 1n;

    // calculate historical sync block range based on current live block
    const syncState = await this.service.repo.syncState.findUniqueSyncState({
      where: {
        chain_id: chainId,
      },
    });

    if (!syncState) {
      throw new Error(`Couldn't find sync state for chain-id: ${chainId}.`);
    }

    // We should define from_block and to_block fields based on:
    // 1. live_current_block (we've not entered any new live_current_block, so it's the last live block we got)
    // 2. current first block in live sync (this.firstLiveBlock)
    // this way we are handling the gap between the last indexed live block and current live block using historical sync
    let fromBlock = 0n;
    const toBlock = this.firstLiveBlock - 1n;

    if (syncState.live_current_block) {
      fromBlock = syncState.live_current_block + 1n;
    }

    const lastRangeWithTheSameFromBlock =
      await this.service.repo.historicalSyncRange.findFirstHistoricalSyncRange({
        where: {
          from_block: fromBlock,
        },
      });

    if (lastRangeWithTheSameFromBlock) {
      await this.service.repo.historicalSyncRange.updateHistoricalSyncRange({
        where: {
          id: lastRangeWithTheSameFromBlock.id,
        },
        data: {
          to_block: toBlock,
        },
      });
    }

    await this.service.repo.historicalSyncRange.upsertHistoricalSyncRange({
      where: {
        from_block_to_block_chain_id: {
          chain_id: chainId,
          from_block: fromBlock,
          to_block: toBlock,
        },
      },
      create: {
        chain_id: chainId,
        from_block: fromBlock,
        to_block: toBlock,
      },
      update: {},
    });

    await this.service.repo.syncState.updateSyncState({
      where: {
        chain_id: chainId,
      },
      data: {
        live_started_at: this.firstLiveBlock,
      },
    });

    const jobId = this.service.helper.queueHelper.createLiveSyncJobId(chainId, [
      this.firstLiveBlock,
    ]);

    // enqueue the first block in live sync
    await this.service.queue.addFIFOJob(
      'HandleLiveSync',
      'HandleLiveSync',
      {
        chainId,
        blockNumbers: [this.firstLiveBlock.toString()],
      },
      jobId,
    );

    // start the block listener
    await this.service.listener.start();
  }
}
