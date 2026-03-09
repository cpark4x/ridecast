import { Client } from "pg";
import * as path from "path";
import * as fs from "fs";

/**
 * Playwright globalSetup — runs once before the full E2E suite.
 *
 * Deletes any content records seeded by the pdf-commute and
 * article-discussion spec files so the duplicate-hash check in
 * POST /api/upload never fires and "Target Duration" reliably
 * appears on every run.
 */
async function globalSetup() {
  // Load .env manually — dotenv not guaranteed in this runtime context
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }

  // Best-effort DB cleanup + seed — with API mocks in place, tests don't
  // strictly need this, so a missing DB shouldn't block the suite.
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      // ── Cleanup ────────────────────────────────────────────────────────────
      // Must cascade manually: PlaybackState → Audio → Script → Content
      // Removes content created by the upload-flow specs on previous runs so
      // the duplicate-hash guard in POST /api/upload never fires.
      await client.query(`
        DELETE FROM "PlaybackState"
        WHERE "audioId" IN (
          SELECT a.id FROM "Audio" a
          JOIN "Script" s ON a."scriptId" = s.id
          JOIN "Content" c ON s."contentId" = c.id
          WHERE c.title = 'sample'
             OR c."sourceUrl" = 'https://paulgraham.com/ds.html'
        )
      `);
      await client.query(`
        DELETE FROM "Audio"
        WHERE "scriptId" IN (
          SELECT s.id FROM "Script" s
          JOIN "Content" c ON s."contentId" = c.id
          WHERE c.title = 'sample'
             OR c."sourceUrl" = 'https://paulgraham.com/ds.html'
        )
      `);
      await client.query(`
        DELETE FROM "Script"
        WHERE "contentId" IN (
          SELECT id FROM "Content"
          WHERE title = 'sample'
             OR "sourceUrl" = 'https://paulgraham.com/ds.html'
        )
      `);
      await client.query(`
        DELETE FROM "Content"
        WHERE title = 'sample'
           OR "sourceUrl" = 'https://paulgraham.com/ds.html'
      `);

      // ── Seed ───────────────────────────────────────────────────────────────
      // Tests that skip API mocks (commute-flow, offline-listening,
      // quick-relisten) navigate directly to the Library and expect at least
      // one "Ready" item.  Those items must belong to the synthetic E2E user
      // that auth.ts injects when E2E_TEST_MODE=true.
      //
      // Strategy: delete-then-reinsert for full idempotency so re-runs on a
      // populated DB always start from a known-good state.

      // 1. Ensure the synthetic user row exists
      await client.query(`
        INSERT INTO "User" (id, name, "createdAt", "updatedAt")
        VALUES ('e2e-test-user', 'E2E Test User', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);

      // 2. Tear down any prior seed chain (Audio → Script → Content)
      await client.query(`
        DELETE FROM "PlaybackState"
        WHERE "audioId" IN (
          SELECT a.id FROM "Audio" a
          JOIN "Script" s ON a."scriptId" = s.id
          WHERE s."contentId" = 'e2e-seed-content-1'
        )
      `);
      await client.query(`
        DELETE FROM "Audio"
        WHERE "scriptId" IN (
          SELECT id FROM "Script" WHERE "contentId" = 'e2e-seed-content-1'
        )
      `);
      await client.query(`DELETE FROM "Script" WHERE "contentId" = 'e2e-seed-content-1'`);
      await client.query(`DELETE FROM "Content" WHERE id = 'e2e-seed-content-1'`);

      // 3. Insert a fresh Content → Script → Audio chain (status = ready)
      await client.query(`
        INSERT INTO "Content"
          (id, "userId", title, "rawText", "wordCount", "sourceType",
           "contentHash", "createdAt", "updatedAt")
        VALUES
          ('e2e-seed-content-1', 'e2e-test-user', 'E2E Seed: Tech Briefing',
           'Seed content for E2E library tests.', 3000, 'pdf',
           'e2e-seed-hash-v1', NOW(), NOW())
      `);
      await client.query(`
        INSERT INTO "Script"
          (id, "contentId", format, "targetDuration", "actualWordCount",
           "compressionRatio", "scriptText", "contentType", themes,
           "createdAt", "updatedAt")
        VALUES
          ('e2e-seed-script-1', 'e2e-seed-content-1', 'narrator', 15, 1500,
           0.5, 'E2E seed script text.', 'article', ARRAY[]::TEXT[],
           NOW(), NOW())
      `);
      await client.query(`
        INSERT INTO "Audio"
          (id, "scriptId", "filePath", "durationSecs", voices, "ttsProvider",
           "createdAt", "updatedAt")
        VALUES
          ('e2e-seed-audio-1', 'e2e-seed-script-1', '/audio/e2e-seed.mp3',
           900, ARRAY['alloy']::TEXT[], 'openai', NOW(), NOW())
      `);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.warn(
      "Global setup DB cleanup/seed skipped:",
      (err as Error).message,
    );
  }
}

export default globalSetup;
