import type { DatabaseService } from '../database.service.js';
import type { Context, PrismaTransaction } from '#app/interfaces/index.js';
import 'dotenv/config';

export enum RedisPrefixes {
  OTP = 'otp',
  SIGNUP_VERIFIED = 'signup_verified',
  TUS_UPLOAD_RESULT = 'tus_upload_result',
}

const BRAND = process.env.BRAND_NAME;

export class BaseRepository {
  constructor(protected readonly db: DatabaseService) {}

  protected _transactionChecker(ctx?: Context): PrismaTransaction {
    return ctx?.prisma ?? this.db.getPrisma();
  }

  protected getRedisKey = (
    prefix: RedisPrefixes,
    ...keys: (string | number)[]
  ): string => {
    const joinedKeys = keys.filter((k) => k !== undefined && k !== null).join(':');
    return `{${BRAND}}:${prefix}${joinedKeys ? ':' + joinedKeys : ''}`;
  };

  /**
   * Usage examples:
   *
   * 1) With a query function (best typing for include/select):
   *```
   * const { items } = await this.fetchDataWithPagination(
   *   (tx) => tx.notification,
   *   { take, cursor: { id: cursorId }, orderBy: { createdAt: 'desc' } },
   *   (model, args) => model.findMany({
   *     ...args,
   *     include: {
   *       token_alert: { include: { token: true, price_token_alert: true } },
   *     },
   *   }),
   * );
   *```
   *
   * 2) Passing full findMany args directly (simpler):
   *```
   * const { items } = await this.fetchDataWithPagination(
   *   (tx) => tx.notification,
   *   {
   *     cursor: { id: cursorId },
   *     orderBy: { createdAt: 'desc' },
   *   },
   *   { take },
   * );
   *```
   */
  // Overload A: pass full Prisma findMany args (generic, but may not preserve include typing in callers)
  public async fetchDataWithPagination<
    TDelegate extends { findMany: (args: any) => Promise<any[]> },
    TArgs extends Parameters<TDelegate['findMany']>[0],
    TResult extends Awaited<ReturnType<TDelegate['findMany']>>,
  >(
    getModel: (tx: PrismaTransaction) => TDelegate,
    args: TArgs,
    options: {
      ctx?: Context;
      take: number;
      orderBy?: TArgs extends { orderBy?: infer O } ? O : never;
      orderField?: keyof NonNullable<
        TArgs extends { orderBy?: infer O }
          ? O extends any[]
            ? O[number]
            : O
          : never
      >;
      order?: 'asc' | 'desc';
    },
  ): Promise<{ items: TResult; hasNextPage: boolean }>;

  // Overload B: provide a query function to fully preserve Prisma include typing
  public async fetchDataWithPagination<TModel, TResult extends any[]>(
    getModel: (tx: PrismaTransaction) => TModel,
    options: {
      ctx?: Context;
      take: number;
      cursor?: any;
      orderBy?: any;
      orderField?: PropertyKey;
      order?: 'asc' | 'desc';
    },
    queryFn: (
      model: TModel,
      args: { take: number; skip: number; cursor?: any; orderBy: any },
    ) => Promise<TResult>,
  ): Promise<{ items: TResult[number][]; hasNextPage: boolean }>;

  public async fetchDataWithPagination(
    getModel: (tx: PrismaTransaction) => any,
    a: any,
    b?: any,
  ): Promise<{ items: any[]; hasNextPage: boolean }> {
    const tx = this._transactionChecker(b?.ctx ?? a?.ctx);
    const model = getModel(tx);

    const isCallbackSignature = typeof b === 'function';

    const options = (isCallbackSignature ? a : b) ?? {};

    const effectiveOrderBy =
      (isCallbackSignature ? a?.orderBy : a?.orderBy) ??
      (options.orderField && options.order
        ? { [options.orderField]: options.order }
        : undefined);

    if (!effectiveOrderBy) {
      throw new Error('orderBy or (orderField and order) must be provided');
    }

    const limitPlusOne = Math.abs(options.take) + 1;

    const paginationArgs = {
      orderBy: effectiveOrderBy,
      take: options.take > 0 ? limitPlusOne : -limitPlusOne,
      skip: isCallbackSignature ? (a?.cursor ? 1 : 0) : a?.cursor ? 1 : 0,
      cursor: isCallbackSignature ? a?.cursor : a?.cursor,
    } as const;

    let results: any[];

    if (isCallbackSignature) {
      const queryFn = b as (
        model: any,
        args: { take: number; skip: number; cursor?: any; orderBy: any },
      ) => Promise<any[]>;
      results = await queryFn(model, paginationArgs);
    } else {
      const findManyArgs = {
        ...a,
        orderBy: paginationArgs.orderBy,
        take: paginationArgs.take,
        skip: paginationArgs.skip,
      };
      results = await model.findMany(findManyArgs);
    }

    const hasNextPage = results.length > Math.abs(options.take);
    const sliced = hasNextPage ? results.slice(0, Math.abs(options.take)) : results;

    return { items: sliced, hasNextPage };
  }
}
