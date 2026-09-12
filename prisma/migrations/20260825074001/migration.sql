/*
  Warnings:

  - The primary key for the `token_transfer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `amount` on the `token_transfer` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `token_transfer` table. All the data in the column will be lost.
  - Added the required column `value` to the `token_transfer` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "token_transfer_chain_id_timestamp_idx";

-- AlterTable
ALTER TABLE "token_transfer" DROP CONSTRAINT "token_transfer_pkey",
DROP COLUMN "amount",
DROP COLUMN "timestamp",
ADD COLUMN     "value" BIGINT NOT NULL,
ALTER COLUMN "log_index" SET DATA TYPE BIGINT,
ADD CONSTRAINT "token_transfer_pkey" PRIMARY KEY ("chain_id", "tx_hash", "log_index");
