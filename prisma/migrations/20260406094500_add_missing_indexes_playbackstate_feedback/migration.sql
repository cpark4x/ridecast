-- CreateIndex
CREATE INDEX "PlaybackState_audioId_idx" ON "PlaybackState"("audioId");

-- CreateIndex
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt" DESC);
