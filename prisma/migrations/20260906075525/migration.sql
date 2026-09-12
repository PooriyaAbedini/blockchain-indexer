/*
  Warnings:

  - Added the required column `sync_type` to the `indexer_error` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SYNC_TYPE" AS ENUM ('HISTORICAL', 'LIVE');

-- AlterTable
ALTER TABLE "indexer_error" ADD COLUMN     "sync_type" "SYNC_TYPE" NOT NULL,
ALTER COLUMN "sync_gap_id" DROP NOT NULL;
