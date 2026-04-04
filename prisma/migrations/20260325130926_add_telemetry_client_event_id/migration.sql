-- CreateTable (idempotent: table is formally introduced in 20260325164654 but must exist here first)
CREATE TABLE IF NOT EXISTS "TelemetryEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "surfaced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "TelemetryEvent" ADD COLUMN IF NOT EXISTS "clientEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TelemetryEvent_clientEventId_key" ON "TelemetryEvent"("clientEventId");
