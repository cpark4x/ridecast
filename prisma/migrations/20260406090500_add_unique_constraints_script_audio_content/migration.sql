-- TOCTOU fix: prevent duplicate Script rows for the same (contentId, targetDuration) pair.
-- Two concurrent POST /api/process requests could both pass the in-memory check and create
-- duplicates. This constraint makes the DB the single source of truth.
-- NOTE: If duplicates exist, run this first:
--   DELETE FROM "Script" WHERE id NOT IN (
--     SELECT MIN(id) FROM "Script" GROUP BY "contentId", "targetDuration"
--   );
CREATE UNIQUE INDEX "Script_contentId_targetDuration_key" ON "Script"("contentId", "targetDuration");

-- TOCTOU fix: prevent duplicate Audio rows for the same scriptId.
-- Two concurrent POST /api/audio/generate requests could both pass the findFirst check
-- and create duplicates (wasting TTS cost + Azure storage).
-- NOTE: If duplicates exist, run this first:
--   DELETE FROM "Audio" WHERE id NOT IN (
--     SELECT MIN(id) FROM "Audio" GROUP BY "scriptId"
--   );
CREATE UNIQUE INDEX "Audio_scriptId_key" ON "Audio"("scriptId");

-- TOCTOU fix: prevent duplicate Content rows for the same (userId, sourceUrl) pair.
-- Covers both POST /api/upload (URL fast-path) and POST /api/pocket/save.
-- NULL sourceUrl values are not constrained (Postgres treats NULLs as distinct).
-- NOTE: If duplicates exist, run this first:
--   DELETE FROM "Content" WHERE id NOT IN (
--     SELECT MIN(id) FROM "Content"
--     WHERE "sourceUrl" IS NOT NULL
--     GROUP BY "userId", "sourceUrl"
--   );
CREATE UNIQUE INDEX "Content_userId_sourceUrl_key" ON "Content"("userId", "sourceUrl");
