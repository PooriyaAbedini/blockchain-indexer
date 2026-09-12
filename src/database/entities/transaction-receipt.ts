import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { BaseRepository } from './baseRepository.js';
import type { Context } from '#app/interfaces/index.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class TransactionReceiptRepository extends BaseRepository {
  constructor(@Inject(DatabaseService) db: DatabaseService) {
    super(db);
  }

  // Transaction receipt methods:
  async createReceipt(args: Prisma.txn_receiptCreateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).txn_receipt.create(args);
  }

  async createManyReceipts(
    args: Prisma.txn_receiptCreateManyArgs,
    ctx?: Context,
  ): Promise<Prisma.BatchPayload> {
    return await this._transactionChecker(ctx).txn_receipt.createMany(args);
  }

  async findFirstReceipt<T extends Prisma.txn_receiptFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.txn_receiptFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.txn_receiptGetPayload<T> | null> {
    return await this._transactionChecker(ctx).txn_receipt.findFirst(args);
  }

  async findUniqueReceipt<T extends Prisma.txn_receiptFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.txn_receiptFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.txn_receiptGetPayload<T> | null> {
    return await this._transactionChecker(ctx).txn_receipt.findUnique(args);
  }

  async updateReceipt(args: Prisma.txn_receiptUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).txn_receipt.update(args);
  }

  async deleteReceipt(args: Prisma.txn_receiptDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).txn_receipt.delete(args);
  }

  // Transaction Receipt logs methods:
  async createReceiptLog(args: Prisma.txn_receipt_logCreateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).txn_receipt_log.create(args);
  }

  async createManyReceiptLogs(
    args: Prisma.txn_receipt_logCreateManyArgs,
    ctx?: Context,
  ): Promise<Prisma.BatchPayload> {
    return await this._transactionChecker(ctx).txn_receipt_log.createMany(args);
  }

  async findFirstReceiptLog<T extends Prisma.txn_receipt_logFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.txn_receipt_logFindFirstArgs>,
    ctx?: Context,
  ): Promise<Prisma.txn_receipt_logGetPayload<T> | null> {
    return await this._transactionChecker(ctx).txn_receipt_log.findFirst(args);
  }

  async findUniqueReceiptLog<T extends Prisma.txn_receipt_logFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.txn_receipt_logFindUniqueArgs>,
    ctx?: Context,
  ): Promise<Prisma.txn_receipt_logGetPayload<T> | null> {
    return await this._transactionChecker(ctx).txn_receipt_log.findUnique(args);
  }

  async updateReceiptLog(args: Prisma.txn_receipt_logUpdateArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).txn_receipt_log.update(args);
  }

  async deleteTransationLog(args: Prisma.txn_receipt_logDeleteArgs, ctx?: Context) {
    return await this._transactionChecker(ctx).txn_receipt_log.delete(args);
  }
}
