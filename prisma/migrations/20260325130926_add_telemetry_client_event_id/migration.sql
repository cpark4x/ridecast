-- AlterTable
ALTER TABLE "TelemetryEvent" ADD COLUMN "clientEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TelemetryEvent_clientEventId_key" ON "TelemetryEvent"("clientEventId");
