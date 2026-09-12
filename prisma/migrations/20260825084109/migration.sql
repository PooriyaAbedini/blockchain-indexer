-- AlterTable
ALTER TABLE "block" ALTER COLUMN "base_fee_per_gas" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "difficulty" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "token_transfer" ALTER COLUMN "value" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "transaction" ALTER COLUMN "value" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "gas_price" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "max_fee_per_gas" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "max_priority_fee_per_gas" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "max_fee_per_blob_gas" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "txn_receipt" ALTER COLUMN "cumulative_gas_used" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "effective_gas_price" DROP NOT NULL,
ALTER COLUMN "effective_gas_price" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "gas_used" SET DATA TYPE DECIMAL(78,0);
