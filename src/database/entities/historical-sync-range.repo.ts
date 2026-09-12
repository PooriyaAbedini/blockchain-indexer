import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class HistoricalSyncRangeRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  async createHistoricalSyncRange(
    args: Prisma.historical_sync_rangeCreateArgs,
    ctx?: Context,
  ) {
    return await this._transactionChecker(ctx).historical_sync_range.create(args);
  }

  async findFirstHistoricalSyncRange<
    T extends Prisma.historical_sync_rangeFindFirstArgs,
  >(
    args: Prisma.SelectSubset<T, Prisma.historical_sync_rangeFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.historical_sync_rangeGetPayload<T> | null> {
    return await this._transactionChecker(ctx).historical_sync_range.findFirst(args);
  }

  async findUniqueHistoricalSyncRange<
    T extends Prisma.historical_sync_rangeFindUniqueArgs,
  >(
    args: Prisma.SelectSubset<T, Prisma.historical_sync_rangeFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.historical_sync_rangeGetPayload<T> | null> {
    return await this._transactionChecker(ctx).historical_sync_range.findUnique(
      args,
    );
  }

  async updateHistoricalSyncRange(
    args: Prisma.historical_sync_rangeUpdateArgs,
    ctx?: Context,
  ) {
    return await this._transactionChecker(ctx).historical_sync_range.update(args);
  }

  async upsertHistoricalSyncRange(
    args: Prisma.historical_sync_rangeUpsertArgs,
    ctx?: Context,
  ) {
    return await this._transactionChecker(ctx).historical_sync_range.upsert(args);
  }

  async deleteHistoricalSyncRange(
    args: Prisma.historical_sync_rangeDeleteArgs,
    ctx?: Context,
  ) {
    return await this._transactionChecker(ctx).historical_sync_range.delete(args);
  }
}
