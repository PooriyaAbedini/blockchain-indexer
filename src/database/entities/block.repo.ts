import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class BlockRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  async createBlock(args: Prisma.blockCreateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).block.create(args);
  }

  async createManyBlocks(
    args: Prisma.blockCreateManyArgs,
    ctx?: Context,
  ): Promise<Prisma.BatchPayload> {
    return await this._transactionChecker(ctx).block.createMany(args);
  }

  async findFirstBlock<T extends Prisma.blockFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.blockFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.blockGetPayload<T> | null> {
    return await this._transactionChecker(ctx).block.findFirst(args);
  }

  async findUniqueBlock<T extends Prisma.blockFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.blockFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.blockGetPayload<T> | null> {
    return await this._transactionChecker(ctx).block.findUnique(args);
  }

  async updateBlock(args: Prisma.blockUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).block.update(args);
  }

  async deleteBlock(args: Prisma.blockDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).block.delete(args);
  }

  async deleteManyBlocks(args: Prisma.blockDeleteManyArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).block.deleteMany(args);
  }
}
