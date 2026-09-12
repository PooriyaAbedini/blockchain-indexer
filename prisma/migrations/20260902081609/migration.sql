/*
  Warnings:

  - A unique constraint covering the columns `[from_block,to_block,chain_id]` on the table `historical_sync_range` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "historical_sync_range_from_block_to_block_chain_id_key" ON "historical_sync_range"("from_block", "to_block", "chain_id");
