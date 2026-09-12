/*
  Warnings:

  - You are about to drop the `txn_reciept_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "txn_reciept_log" DROP CONSTRAINT "txn_reciept_log_receipt_id_fkey";

-- DropTable
DROP TABLE "txn_reciept_log";

-- CreateTable
CREATE TABLE "txn_receipt_log" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "topics" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "logIndex" BIGINT NOT NULL,
    "removed" BOOLEAN NOT NULL,
    "receipt_id" TEXT NOT NULL,

    CONSTRAINT "txn_receipt_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "txn_receipt_log_address_idx" ON "txn_receipt_log"("address");

-- CreateIndex
CREATE INDEX "txn_receipt_log_logIndex_idx" ON "txn_receipt_log"("logIndex");

-- CreateIndex
CREATE INDEX "txn_receipt_log_data_idx" ON "txn_receipt_log"("data");

-- CreateIndex
CREATE INDEX "txn_receipt_log_removed_idx" ON "txn_receipt_log"("removed");

-- AddForeignKey
ALTER TABLE "txn_receipt_log" ADD CONSTRAINT "txn_receipt_log_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "txn_receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
