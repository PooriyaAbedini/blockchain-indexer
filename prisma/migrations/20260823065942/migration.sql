/*
  Warnings:

  - You are about to drop the column `historical_from_block` on the `chain_sync_state` table. All the data in the column will be lost.
  - You are about to drop the column `historical_to_block` on the `chain_sync_state` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chain_sync_state" DROP COLUMN "historical_from_block",
DROP COLUMN "historical_to_block";
