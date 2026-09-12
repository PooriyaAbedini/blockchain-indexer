import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class TokenTransferRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  async createTokenTransfer(args: Prisma.token_transferCreateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).token_transfer.create(args);
  }

  async createManyTokenTransfers(
    args: Prisma.token_transferCreateManyArgs,
    ctx?: Context,
  ) {
    return await this._transactionChecker(ctx).token_transfer.createMany(args);
  }

  async findFirstTokenTransfer<T extends Prisma.token_transferFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.token_transferFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.token_transferGetPayload<T> | null> {
    return await this._transactionChecker(ctx).token_transfer.findFirst(args);
  }

  async findUniqueTokenTransfer<T extends Prisma.token_transferFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.token_transferFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.token_transferGetPayload<T> | null> {
    return await this._transactionChecker(ctx).token_transfer.findUnique(args);
  }

  async updateTokenTransfer(args: Prisma.token_transferUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).token_transfer.update(args);
  }

  async deleteTokenTransfer(args: Prisma.token_transferDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).token_transfer.delete(args);
  }
}
