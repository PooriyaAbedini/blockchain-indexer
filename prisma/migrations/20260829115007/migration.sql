-- CreateTable
CREATE TABLE "historical_sync_range" (
    "id" TEXT NOT NULL,
    "from_block" BIGINT NOT NULL,
    "to_block" BIGINT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historical_sync_range_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historical_sync_range" ADD CONSTRAINT "historical_sync_range_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chain_sync_state"("chain_id") ON DELETE CASCADE ON UPDATE CASCADE;
