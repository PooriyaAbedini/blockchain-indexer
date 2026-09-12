import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class SyncStateRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  async createSyncState<T extends Prisma.chain_sync_stateCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.chain_sync_stateCreateArgs>,
    ctx?: Context,
  ): Promise<Prisma.chain_sync_stateGetPayload<T>> {
    return await this._transactionChecker(ctx).chain_sync_state.create(args);
  }

  async findFirstSyncState<T extends Prisma.chain_sync_stateFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.chain_sync_stateFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.chain_sync_stateGetPayload<T> | null> {
    return await this._transactionChecker(ctx).chain_sync_state.findFirst(args);
  }

  async findUniqueSyncState<T extends Prisma.chain_sync_stateFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.chain_sync_stateFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.chain_sync_stateGetPayload<T> | null> {
    return await this._transactionChecker(ctx).chain_sync_state.findUnique(args);
  }

  async updateSyncState(args: Prisma.chain_sync_stateUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).chain_sync_state.update(args);
  }

  async deleteSyncState(args: Prisma.chain_sync_stateDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).chain_sync_state.delete(args);
  }
}
