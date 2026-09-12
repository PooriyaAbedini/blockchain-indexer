/*
  Warnings:

  - You are about to drop the column `latest_block` on the `chain_sync_state` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chain_sync_state" DROP COLUMN "latest_block";
