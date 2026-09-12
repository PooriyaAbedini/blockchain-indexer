/*
  Warnings:

  - A unique constraint covering the columns `[chain_id,from_block,to_block]` on the table `sync_gap` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "GAP_STATUS" ADD VALUE 'QUEUEd';

-- CreateIndex
CREATE INDEX "sync_gap_chain_id_status_idx" ON "sync_gap"("chain_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sync_gap_chain_id_from_block_to_block_key" ON "sync_gap"("chain_id", "from_block", "to_block");
