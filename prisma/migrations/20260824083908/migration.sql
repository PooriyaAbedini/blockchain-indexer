/*
  Warnings:

  - You are about to drop the column `gas_used` on the `transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "gas_used";

-- CreateTable
CREATE TABLE "txn_reciept" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "contract_address" TEXT,
    "cumulative_gas_used" BIGINT,
    "effective_gas_price" BIGINT NOT NULL,
    "from" TEXT NOT NULL,
    "gas_used" TEXT NOT NULL,
    "logs_bloom" TEXT NOT NULL,
    "to" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "txn_reciept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "txn_reciept_log" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "topics" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "logIndex" BIGINT NOT NULL,
    "removed" BOOLEAN NOT NULL,
    "receipt_id" TEXT NOT NULL,

    CONSTRAINT "txn_reciept_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "txn_reciept_chain_id_from_idx" ON "txn_reciept"("chain_id", "from");

-- CreateIndex
CREATE INDEX "txn_reciept_chain_id_to_idx" ON "txn_reciept"("chain_id", "to");

-- CreateIndex
CREATE UNIQUE INDEX "txn_reciept_chain_id_transaction_hash_key" ON "txn_reciept"("chain_id", "transaction_hash");

-- CreateIndex
CREATE INDEX "txn_reciept_log_address_idx" ON "txn_reciept_log"("address");

-- CreateIndex
CREATE INDEX "txn_reciept_log_logIndex_idx" ON "txn_reciept_log"("logIndex");

-- CreateIndex
CREATE INDEX "txn_reciept_log_data_idx" ON "txn_reciept_log"("data");

-- CreateIndex
CREATE INDEX "txn_reciept_log_removed_idx" ON "txn_reciept_log"("removed");

-- AddForeignKey
ALTER TABLE "txn_reciept" ADD CONSTRAINT "txn_reciept_chain_id_transaction_hash_fkey" FOREIGN KEY ("chain_id", "transaction_hash") REFERENCES "transaction"("chain_id", "hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "txn_reciept_log" ADD CONSTRAINT "txn_reciept_log_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "txn_reciept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
