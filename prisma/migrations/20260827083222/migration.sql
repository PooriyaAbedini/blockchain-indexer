/*
  Warnings:

  - The values [QUEUEd] on the enum `GAP_STATUS` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GAP_STATUS_new" AS ENUM ('QUEUED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "sync_gap" ALTER COLUMN "status" TYPE "GAP_STATUS_new" USING ("status"::text::"GAP_STATUS_new");
ALTER TYPE "GAP_STATUS" RENAME TO "GAP_STATUS_old";
ALTER TYPE "GAP_STATUS_new" RENAME TO "GAP_STATUS";
DROP TYPE "public"."GAP_STATUS_old";
COMMIT;
