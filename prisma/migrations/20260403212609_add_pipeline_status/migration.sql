-- AlterTable
ALTER TABLE "Content" ADD COLUMN "pipelineStatus" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "Content" ADD COLUMN "pipelineError" TEXT;
