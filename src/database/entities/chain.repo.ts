import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class ChianRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  async createChain(args: Prisma.chainCreateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).chain.create(args);
  }

  async findFirstChain<T extends Prisma.chainFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.chainFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.chainGetPayload<T> | null> {
    return await this._transactionChecker(ctx).chain.findFirst(args);
  }

  async findUniqueChain<T extends Prisma.chainFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.chainFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.chainGetPayload<T> | null> {
    return await this._transactionChecker(ctx).chain.findUnique(args);
  }

  async updateChain(args: Prisma.chainUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).chain.update(args);
  }

  async upsertChain(args: Prisma.chainUpsertArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).chain.upsert(args);
  }

  async deleteChain(args: Prisma.chainDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).chain.delete(args);
  }
}
