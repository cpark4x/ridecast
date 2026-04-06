-- Partial index on Content.sourceUrl for non-NULL values only.
-- Speeds up "find content by URL" lookups while skipping the ~40% of rows
-- where sourceUrl is NULL (file uploads: pdf, epub, txt).
CREATE INDEX "Content_sourceUrl_partial_idx" ON "Content"("sourceUrl")
  WHERE "sourceUrl" IS NOT NULL;
