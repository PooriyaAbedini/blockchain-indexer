/*
  Warnings:

  - Added the required column `chain_id` to the `txn_receipt_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transaction_hash` to the `txn_receipt_log` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "txn_receipt_log" DROP CONSTRAINT "txn_receipt_log_receipt_id_fkey";

-- AlterTable
ALTER TABLE "txn_receipt_log" ADD COLUMN     "chain_id" INTEGER NOT NULL,
ADD COLUMN     "transaction_hash" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "txn_receipt_log" ADD CONSTRAINT "txn_receipt_log_chain_id_transaction_hash_fkey" FOREIGN KEY ("chain_id", "transaction_hash") REFERENCES "txn_receipt"("chain_id", "transaction_hash") ON DELETE CASCADE ON UPDATE CASCADE;
