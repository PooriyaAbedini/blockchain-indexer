/*
  Warnings:

  - Added the required column `sync_gap_id` to the `indexer_error` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "gap_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "indexer_error" ADD COLUMN     "sync_gap_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "sync_gap" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "from_block" BIGINT NOT NULL,
    "to_block" BIGINT NOT NULL,
    "status" "gap_status" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_gap_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "indexer_error" ADD CONSTRAINT "indexer_error_sync_gap_id_fkey" FOREIGN KEY ("sync_gap_id") REFERENCES "sync_gap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
