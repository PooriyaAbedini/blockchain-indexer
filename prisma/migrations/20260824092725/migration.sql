/*
  Warnings:

  - You are about to drop the column `receipt_id` on the `txn_receipt_log` table. All the data in the column will be lost.
  - Changed the type of `gas_used` on the `txn_receipt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "txn_receipt" DROP COLUMN "gas_used",
ADD COLUMN     "gas_used" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "txn_receipt_log" DROP COLUMN "receipt_id";
