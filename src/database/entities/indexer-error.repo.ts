import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class IndexerErrorRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  async createIndexerError(args: Prisma.indexer_errorCreateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).indexer_error.create(args);
  }

  async findFirstIndexerError<T extends Prisma.indexer_errorFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.indexer_errorFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.indexer_errorGetPayload<T> | null> {
    return await this._transactionChecker(ctx).indexer_error.findFirst(args);
  }

  async findUniqueIndexerError<T extends Prisma.indexer_errorFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.indexer_errorFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.indexer_errorGetPayload<T> | null> {
    return await this._transactionChecker(ctx).indexer_error.findUnique(args);
  }

  async updateIndexerError(args: Prisma.indexer_errorUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).indexer_error.update(args);
  }

  async deleteIndexerError(args: Prisma.indexer_errorDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).indexer_error.delete(args);
  }
}
