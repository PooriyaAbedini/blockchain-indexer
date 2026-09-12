/*
  Warnings:

  - You are about to drop the column `last_error` on the `chain_sync_state` table. All the data in the column will be lost.
  - You are about to drop the column `last_error_at` on the `chain_sync_state` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chain_sync_state" DROP COLUMN "last_error",
DROP COLUMN "last_error_at";

-- CreateTable
CREATE TABLE "indexer_error" (
    "id" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "error_at" TIMESTAMP(3) NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indexer_error_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "indexer_error" ADD CONSTRAINT "indexer_error_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chain_sync_state"("chain_id") ON DELETE CASCADE ON UPDATE CASCADE;
