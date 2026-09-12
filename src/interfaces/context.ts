import type { PrismaTransaction } from './prismaTransaction.js';

export type Context = {
  prisma: PrismaTransaction;

  onSuccess: (() => (() => any) | Promise<any> | void)[];

  onFailure: (() => (() => any) | Promise<any> | void)[];
};
