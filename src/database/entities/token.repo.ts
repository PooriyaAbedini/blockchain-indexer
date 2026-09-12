import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class TokenRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  async createToken(args: Prisma.tokenCreateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).token.create(args);
  }

  async createManyTokens(args: Prisma.tokenCreateManyArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).token.createMany(args);
  }

  async findFirstToken<T extends Prisma.tokenFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.tokenFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.tokenGetPayload<T> | null> {
    return await this._transactionChecker(ctx).token.findFirst(args);
  }

  async findUniqueToken<T extends Prisma.tokenFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.tokenFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.tokenGetPayload<T> | null> {
    return await this._transactionChecker(ctx).token.findUnique(args);
  }

  async updateToken(args: Prisma.tokenUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).token.update(args);
  }

  async deleteToken(args: Prisma.tokenDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).token.delete(args);
  }
}
