import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ServiceRegistry } from '#app/core/service/service-registry.js';
import { serviceTokens } from '#app/core/service/service-tokens.js';
import { $Enums } from '#app/database/generated/prisma/client.js';
import {
  chainById,
  type ChainId,
  validChainIds,
} from '#app/core/constants/chains.js';

@Injectable()
export class OrchestrationHelper {
  private readonly logger: Logger = new Logger(OrchestrationHelper.name);

  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {}

  async addValidChains() {
    for (const chainId of validChainIds) {
      const network = chainById[chainId];
      await this.service.repo.chain.upsertChain({
        where: {
          id: network.chainId,
        },
        create: {
          id: network.chainId,
          name: network.name,
          slug: network.slug,
          sync_state: {
            create: {
              historical_current_block: null,
              live_current_block: null,
            },
          },
        },
        update: {},
      });
    }
  }

  async getFirstHistoricalRangeToStart(chainId: ChainId, maxBlockspan: bigint) {
    const syncState =
      await this.service.helper.queueHelper.getSyncReportForChain(chainId);

    const historicalRange =
      await this.service.repo.historicalSyncRange.findFirstHistoricalSyncRange({
        where: {
          status: $Enums.HISTORICAL_RANGE_STATUS.PENDING,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

    if (!syncState) throw new Error('Sync state not found!');
    if (!historicalRange) {
      return {
        fromBlock: null,
        toBlock: null,
        sequenceRangeId: null,
      };
    }

    if (syncState.historical_current_block === null) {
      if (historicalRange.from_block !== 0n)
        throw new Error("Historical range doesn't match");
    }

    // I think this can make the startup fragile since in some scenarios
    // app could crash before updating the range status
    // else {
    //   if (
    //     historicalRange.from_block > syncState.historical_current_block ||
    //     historicalRange.to_block < syncState.historical_current_block
    //   ) {
    //     throw new Error(
    //       'Historical range is not in sync with the historical current block sync state!',
    //     );
    //   }
    // }

    let fromBlock: bigint | null = null;
    let toBlock: bigint | null = null;

    if (syncState.historical_current_block === historicalRange.to_block) {
      // The app broke before updating this range to finalized
      // update that and find the next pending range

      await this.service.repo.historicalSyncRange.updateHistoricalSyncRange({
        where: {
          id: historicalRange.id,
        },
        data: {
          status: $Enums.HISTORICAL_RANGE_STATUS.FINALIZED,
        },
      });

      const nextBlockRange =
        await this.service.repo.historicalSyncRange.findFirstHistoricalSyncRange({
          where: {
            chain_id: chainId,
            status: $Enums.HISTORICAL_RANGE_STATUS.PENDING,
          },
          orderBy: {
            created_at: 'asc',
          },
        });

      if (!nextBlockRange) {
        return {
          fromBlock: null,
          toBlock: null,
          sequenceRangeId: null,
        };
      }

      fromBlock = nextBlockRange.from_block;
      toBlock = fromBlock + maxBlockspan - 1n;

      return {
        fromBlock,
        toBlock,
        sequenceRangeId: nextBlockRange.id,
      };
    }

    fromBlock = syncState.historical_current_block
      ? syncState.historical_current_block + 1n
      : 0n;

    toBlock =
      historicalRange.to_block <= fromBlock + maxBlockspan - 1n
        ? historicalRange.to_block
        : fromBlock + maxBlockspan - 1n;

    return {
      fromBlock,
      toBlock,
      sequenceRangeId: historicalRange.id,
    };
  }

  async handleHistoricalSequenceRange(
    lastLiveBlock: bigint,
    currLiveStartBlock: bigint,
    chainId: ChainId,
  ) {
    await this.service.repo.historicalSyncRange.upsertHistoricalSyncRange({
      where: {
        from_block_to_block_chain_id: {
          from_block: lastLiveBlock + 1n,
          to_block: currLiveStartBlock - 1n,
          chain_id: chainId,
        },
      },
      create: {
        from_block: lastLiveBlock + 1n,
        to_block: currLiveStartBlock - 1n,
        chain_id: chainId,
      },
      update: {},
    });
  }

  // async handleNextHistoricalSyncFIFO(lastFromBlock: bigint, lastToBlock: bigint) {

  // }
}
