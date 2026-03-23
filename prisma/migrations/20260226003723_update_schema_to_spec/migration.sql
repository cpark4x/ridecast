/*
  Warnings:

  - You are about to alter the column `durationSecs` on the `Audio` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "Audio" ALTER COLUMN "durationSecs" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "name" SET DEFAULT 'Default User';
