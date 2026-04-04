-- CreateIndex
CREATE INDEX "Content_userId_createdAt_idx" ON "Content"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Content_userId_sourceUrl_idx" ON "Content"("userId", "sourceUrl");

-- CreateIndex
CREATE INDEX "Script_contentId_idx" ON "Script"("contentId");

-- CreateIndex
CREATE INDEX "Audio_scriptId_createdAt_idx" ON "Audio"("scriptId", "createdAt" DESC);
