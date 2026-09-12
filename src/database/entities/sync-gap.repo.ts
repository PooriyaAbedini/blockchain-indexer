import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class SyncGapRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  async createSyncGap(args: Prisma.sync_gapCreateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).sync_gap.create(args);
  }

  async findFirstSyncGap<T extends Prisma.sync_gapFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.sync_gapFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.sync_gapGetPayload<T> | null> {
    return await this._transactionChecker(ctx).sync_gap.findFirst(args);
  }

  async findUniqueSyncGap<T extends Prisma.sync_gapFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.sync_gapFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.sync_gapGetPayload<T> | null> {
    return await this._transactionChecker(ctx).sync_gap.findUnique(args);
  }

  async updateSyncGap(args: Prisma.sync_gapUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).sync_gap.update(args);
  }

  async updateManySyncGap(args: Prisma.sync_gapUpdateManyArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).sync_gap.updateMany(args);
  }

  async upsertSyncGap<T extends Prisma.sync_gapUpsertArgs>(
    args: Prisma.SelectSubset<T, Prisma.sync_gapUpsertArgs>,
    ctx?: Context,
  ): Promise<Prisma.sync_gapGetPayload<T>> {
    return await this._transactionChecker(ctx).sync_gap.upsert(args);
  }

  async deleteSyncGap(args: Prisma.sync_gapDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).sync_gap.delete(args);
  }
}
