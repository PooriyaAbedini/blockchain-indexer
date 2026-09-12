/*
  Warnings:

  - You are about to drop the column `chain_id_rpc` on the `transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "chain_id_rpc";
