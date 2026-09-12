import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class TransactionRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  async createTransaction(args: Prisma.transactionCreateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).transaction.create(args);
  }

  async createManyTransactions(
    args: Prisma.transactionCreateManyArgs,
    ctx?: Context,
  ) {
    return await this._transactionChecker(ctx).transaction.createMany(args);
  }

  async findFirstTransaction<T extends Prisma.transactionFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.transactionFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.transactionGetPayload<T> | null> {
    return await this._transactionChecker(ctx).transaction.findFirst(args);
  }

  async findUniqueTransaction<T extends Prisma.transactionFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.transactionFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.transactionGetPayload<T> | null> {
    return await this._transactionChecker(ctx).transaction.findUnique(args);
  }

  async updateTransaction(args: Prisma.transactionUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).transaction.update(args);
  }

  async deleteTransaction(args: Prisma.transactionDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).transaction.delete(args);
  }
}
