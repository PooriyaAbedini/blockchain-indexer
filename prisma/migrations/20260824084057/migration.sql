/*
  Warnings:

  - You are about to drop the `txn_reciept` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "txn_reciept" DROP CONSTRAINT "txn_reciept_chain_id_transaction_hash_fkey";

-- DropForeignKey
ALTER TABLE "txn_reciept_log" DROP CONSTRAINT "txn_reciept_log_receipt_id_fkey";

-- DropTable
DROP TABLE "txn_reciept";

-- CreateTable
CREATE TABLE "txn_receipt" (
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

    CONSTRAINT "txn_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "txn_receipt_chain_id_from_idx" ON "txn_receipt"("chain_id", "from");

-- CreateIndex
CREATE INDEX "txn_receipt_chain_id_to_idx" ON "txn_receipt"("chain_id", "to");

-- CreateIndex
CREATE UNIQUE INDEX "txn_receipt_chain_id_transaction_hash_key" ON "txn_receipt"("chain_id", "transaction_hash");

-- AddForeignKey
ALTER TABLE "txn_receipt" ADD CONSTRAINT "txn_receipt_chain_id_transaction_hash_fkey" FOREIGN KEY ("chain_id", "transaction_hash") REFERENCES "transaction"("chain_id", "hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "txn_reciept_log" ADD CONSTRAINT "txn_reciept_log_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "txn_receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
