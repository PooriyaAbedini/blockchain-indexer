-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('IDLE', 'RUNNING', 'PAUSED', 'FAILED');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "chain" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block" (
    "chain_id" INTEGER NOT NULL,
    "number" BIGINT NOT NULL,
    "hash" TEXT NOT NULL,
    "parent_hash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "transaction_count" INTEGER NOT NULL,
    "gas_limit" BIGINT NOT NULL,
    "gas_used" BIGINT NOT NULL,
    "base_fee_per_gas" BIGINT,
    "miner" TEXT,
    "state_root" TEXT,
    "transactions_root" TEXT,
    "receipts_root" TEXT,
    "size" BIGINT,
    "difficulty" BIGINT,
    "logs_bloom" TEXT,

    CONSTRAINT "block_pkey" PRIMARY KEY ("chain_id","number")
);

-- CreateTable
CREATE TABLE "transaction" (
    "chain_id" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "transaction_index" INTEGER NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT,
    "nonce" BIGINT NOT NULL,
    "value" BIGINT NOT NULL,
    "gas_limit" BIGINT NOT NULL,
    "gas_used" BIGINT,
    "gas_price" BIGINT,
    "max_fee_per_gas" BIGINT,
    "max_priority_fee_per_gas" BIGINT,
    "max_fee_per_blob_gas" BIGINT,
    "input" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "chain_id_rpc" BIGINT,
    "status" "transaction_status",

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("chain_id","hash")
);

-- CreateTable
CREATE TABLE "token" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "symbol" TEXT,
    "name" TEXT,
    "decimals" INTEGER,

    CONSTRAINT "token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_transfer" (
    "chain_id" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "log_index" INTEGER NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "token_address" TEXT NOT NULL,

    CONSTRAINT "token_transfer_pkey" PRIMARY KEY ("chain_id","tx_hash","log_index")
);

-- CreateTable
CREATE TABLE "chain_sync_state" (
    "chain_id" INTEGER NOT NULL,
    "historical_from_block" BIGINT,
    "historical_to_block" BIGINT,
    "historical_current" BIGINT,
    "historical_status" "sync_status" NOT NULL DEFAULT 'IDLE',
    "live_current_block" BIGINT,
    "live_status" "sync_status" NOT NULL DEFAULT 'IDLE',
    "latest_block" BIGINT,
    "last_error" TEXT,
    "last_error_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_sync_state_pkey" PRIMARY KEY ("chain_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chain_slug_key" ON "chain"("slug");

-- CreateIndex
CREATE INDEX "block_chain_id_parent_hash_idx" ON "block"("chain_id", "parent_hash");

-- CreateIndex
CREATE UNIQUE INDEX "block_chain_id_hash_key" ON "block"("chain_id", "hash");

-- CreateIndex
CREATE INDEX "transaction_chain_id_block_number_idx" ON "transaction"("chain_id", "block_number");

-- CreateIndex
CREATE INDEX "transaction_chain_id_from_idx" ON "transaction"("chain_id", "from");

-- CreateIndex
CREATE INDEX "transaction_chain_id_to_idx" ON "transaction"("chain_id", "to");

-- CreateIndex
CREATE INDEX "token_chain_id_symbol_idx" ON "token"("chain_id", "symbol");

-- CreateIndex
CREATE INDEX "token_chain_id_name_idx" ON "token"("chain_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "token_chain_id_address_key" ON "token"("chain_id", "address");

-- CreateIndex
CREATE INDEX "token_transfer_chain_id_block_number_idx" ON "token_transfer"("chain_id", "block_number");

-- CreateIndex
CREATE INDEX "token_transfer_chain_id_from_idx" ON "token_transfer"("chain_id", "from");

-- CreateIndex
CREATE INDEX "token_transfer_chain_id_to_idx" ON "token_transfer"("chain_id", "to");

-- CreateIndex
CREATE INDEX "token_transfer_chain_id_token_address_idx" ON "token_transfer"("chain_id", "token_address");

-- CreateIndex
CREATE INDEX "token_transfer_chain_id_timestamp_idx" ON "token_transfer"("chain_id", "timestamp");

-- AddForeignKey
ALTER TABLE "block" ADD CONSTRAINT "block_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_chain_id_block_number_fkey" FOREIGN KEY ("chain_id", "block_number") REFERENCES "block"("chain_id", "number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token" ADD CONSTRAINT "token_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_transfer" ADD CONSTRAINT "token_transfer_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_transfer" ADD CONSTRAINT "token_transfer_chain_id_block_number_fkey" FOREIGN KEY ("chain_id", "block_number") REFERENCES "block"("chain_id", "number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_transfer" ADD CONSTRAINT "token_transfer_chain_id_tx_hash_fkey" FOREIGN KEY ("chain_id", "tx_hash") REFERENCES "transaction"("chain_id", "hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_transfer" ADD CONSTRAINT "token_transfer_chain_id_token_address_fkey" FOREIGN KEY ("chain_id", "token_address") REFERENCES "token"("chain_id", "address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_sync_state" ADD CONSTRAINT "chain_sync_state_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
