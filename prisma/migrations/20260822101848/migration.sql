-- AlterTable
ALTER TABLE "chain" ALTER COLUMN "updated_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "chain_sync_state" ALTER COLUMN "updated_at" DROP NOT NULL;
