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

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // Must cascade manually: PlaybackState → Audio → Script → Content
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
  } finally {
    await client.end();
  }
}

export default globalSetup;
