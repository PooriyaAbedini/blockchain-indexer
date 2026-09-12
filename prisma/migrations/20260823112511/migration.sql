/*
  Warnings:

  - The `historical_status` column on the `chain_sync_state` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `live_status` column on the `chain_sync_state` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `status` on the `sync_gap` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "GAP_STATUS" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SYNC_STATUS" AS ENUM ('IDLE', 'RUNNING', 'PAUSED', 'FAILED');

-- CreateEnum
CREATE TYPE "TRANSACTION_STATUS" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "chain_sync_state" DROP COLUMN "historical_status",
ADD COLUMN     "historical_status" "SYNC_STATUS" NOT NULL DEFAULT 'IDLE',
DROP COLUMN "live_status",
ADD COLUMN     "live_status" "SYNC_STATUS" NOT NULL DEFAULT 'IDLE';

-- AlterTable
ALTER TABLE "sync_gap" DROP COLUMN "status",
ADD COLUMN     "status" "GAP_STATUS" NOT NULL;

-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "status",
ADD COLUMN     "status" "TRANSACTION_STATUS";

-- DropEnum
DROP TYPE "gap_status";

-- DropEnum
DROP TYPE "sync_status";

-- DropEnum
DROP TYPE "transaction_status";
