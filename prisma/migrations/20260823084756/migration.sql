/*
  Warnings:

  - You are about to drop the column `historical_current` on the `chain_sync_state` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chain_sync_state" DROP COLUMN "historical_current",
ADD COLUMN     "historical_current_block" BIGINT;
