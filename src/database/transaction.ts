import { Injectable, Inject } from '@nestjs/common';
import type { PrismaClient } from '#app/database/generated/prisma/client.js';
import { Logger } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import type { Context, PrismaTransaction } from '#app/interfaces/index.js';

@Injectable()
export class Transaction {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}

  public start = async <R>(
    fn: (context: Context) => Promise<R>,
    opt?: Parameters<PrismaClient['$transaction']>[1],
  ): Promise<R> => {
    const context: Context = {
      onFailure: [],
      onSuccess: [],
      prisma: undefined as unknown as PrismaTransaction,
    };

    const prismaFn = async (prisma: PrismaTransaction): Promise<R> => {
      context.prisma = prisma;
      return fn(context);
    };

    return this.db
      .getPrisma()
      .$transaction(prismaFn, opt)
      .then(async (result: any) => {
        for (const item of context.onSuccess) {
          try {
            const result = item() as any;

            if (result instanceof Promise) {
              await result;
            }
          } catch (err) {
            Logger.error(err);
          }
        }

        return result;
      })
      .catch(async (err: any) => {
        for (const item of context.onFailure) {
          try {
            const result = item() as any;

            if (result instanceof Promise) {
              await result;
            }
          } catch (err) {
            Logger.error(err);
          }
        }

        throw err;
      });
  };
}
