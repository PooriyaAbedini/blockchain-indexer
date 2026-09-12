/*
  Warnings:

  - You are about to drop the column `gas_limit` on the `transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "gas_limit";
