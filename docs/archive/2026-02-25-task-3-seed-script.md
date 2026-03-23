# Task 3: Seed Script with Test Data — Implementation Plan

> **Execution:** Use the subagent-driven-development workflow to implement this plan.

> **WARNING — Quality Review Loop Exhausted:** This task's implementation went through 3 quality
> review iterations before the loop timed out. The *final* verdict was **APPROVED** with no critical
> or important issues, but the reviewer flagged this as requiring human attention during the
> approval gate. Review the existing code carefully before committing.

**Goal:** Create an idempotent seed script that populates the database with realistic test data across all 5 models (User, Content, Script, Audio, PlaybackState).

**Architecture:** Seed script lives at `prisma/seed.ts` and exports a `seed()` function that accepts an optional injected `PrismaClient` for testing. Uses upsert for User and Content (stable entities with unique keys), and delete-then-recreate for Script, Audio, and PlaybackState (dependent entities without stable unique keys). Test suite at `src/lib/seed.test.ts` validates all entity counts and field values via the shared Prisma client from `src/lib/db.ts`.

**Tech Stack:** TypeScript, Prisma Client (with `@prisma/adapter-pg`), Vitest, PostgreSQL

**Depends on:** Task 2 (Prisma schema + migration must be applied first)

---

> **NOTE:** This code already exists in the repo. The tasks below document the *intended*
> implementation for auditability. If the files already match, each task reduces to
> "verify the existing code matches the spec, run the tests, commit."

---

### Task 1: Create the Seed Script

**Files:**
- Create: `prisma/seed.ts`

**Step 1: Create `prisma/seed.ts`**

Create `prisma/seed.ts` with the following content:

```typescript
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { fileURLToPath } from 'node:url';

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export async function seed(injectedPrisma?: PrismaClient) {
  const prisma = injectedPrisma ?? createClient();

  try {
    // 1. Upsert default user
    const user = await prisma.user.upsert({
      where: { id: 'default-user' },
      update: { name: 'Default User' },
      create: { id: 'default-user', name: 'Default User' },
    });
    console.log(`Seeded user: ${user.id}`);

    // 2. Upsert 3 content items (using contentHash for uniqueness)
    const content1 = await prisma.content.upsert({
      where: { contentHash: 'hash-second-brain' },
      update: {}, // No-op update: preserve existing data on re-seed
      create: {
        userId: user.id,
        title: 'How to Build a Second Brain',
        author: 'Tiago Forte',
        rawText: 'Sample raw text for How to Build a Second Brain...',
        wordCount: 8420,
        sourceType: 'epub',
        contentHash: 'hash-second-brain',
      },
    });

    const content2 = await prisma.content.upsert({
      where: { contentHash: 'hash-paul-graham-dttds' },
      update: {}, // No-op update: preserve existing data on re-seed
      create: {
        userId: user.id,
        title: "Paul Graham: Do Things That Don't Scale",
        author: 'Paul Graham',
        rawText: "Sample raw text for Do Things That Don't Scale...",
        wordCount: 4200,
        sourceType: 'url',
        sourceUrl: 'https://paulgraham.com/ds.html',
        contentHash: 'hash-paul-graham-dttds',
      },
    });

    const content3 = await prisma.content.upsert({
      where: { contentHash: 'hash-stripe-annual-2024' },
      update: {}, // No-op update: preserve existing data on re-seed
      create: {
        userId: user.id,
        title: 'Stripe Annual Letter 2024',
        author: 'Patrick Collison',
        rawText: 'Sample raw text for Stripe Annual Letter 2024...',
        wordCount: 12000,
        sourceType: 'pdf',
        contentHash: 'hash-stripe-annual-2024',
      },
    });

    console.log(`Seeded 3 content items: ${content1.title}, ${content2.title}, ${content3.title}`);

    // 3. Create scripts (delete existing first for idempotency, then recreate)
    // Clean up existing scripts/audio/playback for these content items
    await prisma.playbackState.deleteMany({ where: { userId: user.id } });
    await prisma.audio.deleteMany({
      where: { script: { contentId: { in: [content1.id, content2.id, content3.id] } } },
    });
    await prisma.script.deleteMany({
      where: { contentId: { in: [content1.id, content2.id, content3.id] } },
    });

    const script1 = await prisma.script.create({
      data: {
        contentId: content1.id,
        format: 'narrator',
        targetDuration: 15,
        actualWordCount: 1920,
        compressionRatio: 0.23,
        scriptText: 'Sample narrator script for How to Build a Second Brain...',
        themes: ['productivity', 'knowledge-management'],
      },
    });

    const script2 = await prisma.script.create({
      data: {
        contentId: content2.id,
        format: 'conversation',
        targetDuration: 8,
        actualWordCount: 1200,
        compressionRatio: 0.29,
        scriptText: "Sample conversation script for Do Things That Don't Scale...",
        themes: ['startups', 'growth'],
      },
    });

    const script3 = await prisma.script.create({
      data: {
        contentId: content3.id,
        format: 'narrator',
        targetDuration: 22,
        actualWordCount: 3300,
        compressionRatio: 0.28,
        scriptText: 'Sample narrator script for Stripe Annual Letter 2024...',
        themes: ['fintech', 'business'],
      },
    });

    // 4. Create audio records
    const audio1 = await prisma.audio.create({
      data: {
        scriptId: script1.id,
        filePath: '/audio/second-brain-narrator.mp3',
        durationSecs: 768,
        voices: ['alloy'],
        ttsProvider: 'openai',
      },
    });

    await prisma.audio.create({
      data: {
        scriptId: script2.id,
        filePath: '/audio/paul-graham-dttds-conversation.mp3',
        durationSecs: 495,
        voices: ['alloy', 'echo'],
        ttsProvider: 'openai',
      },
    });

    await prisma.audio.create({
      data: {
        scriptId: script3.id,
        filePath: '/audio/stripe-annual-2024-narrator.mp3',
        durationSecs: 1350,
        voices: ['nova'],
        ttsProvider: 'openai',
      },
    });

    // 5. Create playback state (partially listened)
    await prisma.playbackState.create({
      data: {
        userId: user.id,
        audioId: audio1.id,
        position: 318,
        speed: 1.0,
        completed: false,
      },
    });

    console.log('Seeded 3 scripts, 3 audio records, 1 playback state');
  } finally {
    if (!injectedPrisma) {
      await prisma.$disconnect();
    }
  }
}

// Run when executed directly (npx tsx prisma/seed.ts)
const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
```

Key design decisions in this file:
- **Dependency injection**: `seed(injectedPrisma?)` allows tests to pass the shared test client
- **Conditional disconnect**: `finally` block only calls `$disconnect()` when the seed owns the client (not injected)
- **Idempotency strategy**: Upsert for User/Content (stable unique keys); delete-then-recreate for Script/Audio/PlaybackState (no stable unique keys). Delete order respects FK constraints: PlaybackState -> Audio -> Script
- **ESM direct-execution detection**: `process.argv[1] === fileURLToPath(import.meta.url)` is the standard Node ESM pattern

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/chrispark/Projects/ridecast2
npx tsc --noEmit
```

Expected: zero errors.

---

### Task 2: Add Prisma Seed Config to package.json

**Files:**
- Modify: `package.json`

**Step 1: Add prisma seed config**

Add this top-level key to `package.json` (after `"devDependencies"` or anywhere at root level):

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

The full relevant section of `package.json` should look like:

```json
{
  "name": "ridecast2",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  },
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

Note: The `"db:seed": "prisma db seed"` script in `"scripts"` is a convenience alias. The `"prisma"` top-level key is what Prisma actually reads when running `npx prisma db seed`.

**Step 2: Verify seed runs**

```bash
cd /Users/chrispark/Projects/ridecast2
npx prisma db seed
```

Expected output (in some form):
```
Seeded user: default-user
Seeded 3 content items: How to Build a Second Brain, Paul Graham: Do Things That Don't Scale, Stripe Annual Letter 2024
Seeded 3 scripts, 3 audio records, 1 playback state
```

**Step 3: Verify idempotency — run seed a second time**

```bash
npx prisma db seed
```

Expected: same output, no duplicate key errors.

---

### Task 3: Write Seed Integration Tests

**Files:**
- Create: `src/lib/seed.test.ts`

This test file uses the shared Prisma client from `src/lib/db.ts` (not the seed's own client). It imports and runs the `seed()` function with dependency injection, then queries the database to verify all entities were created correctly.

**Step 1: Write the test file**

Create `src/lib/seed.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from './db';

// Seed IDs used in the seed script - must match seed.ts
const DEFAULT_USER_ID = 'default-user';

async function cleanSeedData() {
  await prisma.playbackState.deleteMany({ where: { userId: DEFAULT_USER_ID } });
  await prisma.audio.deleteMany({
    where: { script: { content: { userId: DEFAULT_USER_ID } } },
  });
  await prisma.script.deleteMany({
    where: { content: { userId: DEFAULT_USER_ID } },
  });
  await prisma.content.deleteMany({ where: { userId: DEFAULT_USER_ID } });
  await prisma.user.deleteMany({ where: { id: DEFAULT_USER_ID } });
}

describe('Seed script', () => {
  beforeAll(async () => {
    await cleanSeedData();

    // Run the seed function with the test's shared prisma client
    const { seed } = await import('../../prisma/seed');
    await seed(prisma);
  });

  afterAll(async () => {
    await cleanSeedData();
    await prisma.$disconnect();
  });

  it('creates 1 default user with id "default-user"', async () => {
    const user = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } });
    expect(user).not.toBeNull();
    expect(user!.id).toBe(DEFAULT_USER_ID);
    expect(user!.name).toBeDefined();
  });

  it('creates 3 content items', async () => {
    const contents = await prisma.content.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { title: 'asc' },
    });
    expect(contents).toHaveLength(3);

    // Verify specific content items
    const titles = contents.map((c) => c.title);
    expect(titles).toContain('How to Build a Second Brain');
    expect(titles).toContain('Paul Graham: Do Things That Don\'t Scale');
    expect(titles).toContain('Stripe Annual Letter 2024');

    // Verify source types and word counts
    const brain = contents.find((c) => c.title === 'How to Build a Second Brain');
    expect(brain).toBeDefined();
    expect(brain!.sourceType).toBe('epub');
    expect(brain!.wordCount).toBe(8420);

    const pg = contents.find((c) => c.title.includes('Paul Graham'));
    expect(pg).toBeDefined();
    expect(pg!.sourceType).toBe('url');
    expect(pg!.wordCount).toBe(4200);

    const stripe = contents.find((c) => c.title.includes('Stripe'));
    expect(stripe).toBeDefined();
    expect(stripe!.sourceType).toBe('pdf');
    expect(stripe!.wordCount).toBe(12000);
  });

  it('creates 3 scripts with correct formats and metrics', async () => {
    const scripts = await prisma.script.findMany({
      where: { content: { userId: DEFAULT_USER_ID } },
      include: { content: true },
    });
    expect(scripts).toHaveLength(3);

    // Script for content1 (Second Brain): narrator, 15min, 1920 words, 0.23 ratio
    const s1 = scripts.find((s) => s.content.title === 'How to Build a Second Brain');
    expect(s1).toBeDefined();
    expect(s1!.format).toBe('narrator');
    expect(s1!.targetDuration).toBe(15);
    expect(s1!.actualWordCount).toBe(1920);
    expect(s1!.compressionRatio).toBeCloseTo(0.23, 2);

    // Script for content2 (Paul Graham): conversation, 8min, 1200 words, 0.29 ratio
    const s2 = scripts.find((s) => s.content.title.includes('Paul Graham'));
    expect(s2).toBeDefined();
    expect(s2!.format).toBe('conversation');
    expect(s2!.targetDuration).toBe(8);
    expect(s2!.actualWordCount).toBe(1200);
    expect(s2!.compressionRatio).toBeCloseTo(0.29, 2);

    // Script for content3 (Stripe): narrator, 22min, 3300 words, 0.28 ratio
    const s3 = scripts.find((s) => s.content.title.includes('Stripe'));
    expect(s3).toBeDefined();
    expect(s3!.format).toBe('narrator');
    expect(s3!.targetDuration).toBe(22);
    expect(s3!.actualWordCount).toBe(3300);
    expect(s3!.compressionRatio).toBeCloseTo(0.28, 2);
  });

  it('creates 3 audio records with file paths, durations, and voices', async () => {
    const audios = await prisma.audio.findMany({
      where: { script: { content: { userId: DEFAULT_USER_ID } } },
      include: { script: { include: { content: true } } },
    });
    expect(audios).toHaveLength(3);

    const a1 = audios.find((a) => a.script.content.title === 'How to Build a Second Brain');
    expect(a1).toBeDefined();
    expect(a1!.durationSecs).toBe(768);
    expect(a1!.filePath).toBeDefined();
    expect(a1!.voices.length).toBeGreaterThan(0);

    const a2 = audios.find((a) => a.script.content.title.includes('Paul Graham'));
    expect(a2).toBeDefined();
    expect(a2!.durationSecs).toBe(495);

    const a3 = audios.find((a) => a.script.content.title.includes('Stripe'));
    expect(a3).toBeDefined();
    expect(a3!.durationSecs).toBe(1350);
  });

  it('creates 1 playback state (partially listened, position 318)', async () => {
    const states = await prisma.playbackState.findMany({
      where: { userId: DEFAULT_USER_ID },
    });
    expect(states).toHaveLength(1);
    expect(states[0].position).toBe(318);
    expect(states[0].completed).toBe(false);
  });

  it('is idempotent (running seed twice produces same counts)', async () => {
    // Run seed again with the test's shared prisma client
    const { seed } = await import('../../prisma/seed');
    await seed(prisma);

    // Should still have the same counts across all tables
    const userCount = await prisma.user.count({ where: { id: DEFAULT_USER_ID } });
    const contentCount = await prisma.content.count({ where: { userId: DEFAULT_USER_ID } });
    const scriptCount = await prisma.script.count({ where: { content: { userId: DEFAULT_USER_ID } } });
    const audioCount = await prisma.audio.count({ where: { script: { content: { userId: DEFAULT_USER_ID } } } });
    const playbackCount = await prisma.playbackState.count({ where: { userId: DEFAULT_USER_ID } });

    expect(userCount).toBe(1);
    expect(contentCount).toBe(3);
    expect(scriptCount).toBe(3);
    expect(audioCount).toBe(3);
    expect(playbackCount).toBe(1);
  });
});
```

**Step 2: Run tests to verify they pass**

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/lib/seed.test.ts
```

Expected: 6 tests pass:
- `creates 1 default user with id "default-user"` — PASS
- `creates 3 content items` — PASS
- `creates 3 scripts with correct formats and metrics` — PASS
- `creates 3 audio records with file paths, durations, and voices` — PASS
- `creates 1 playback state (partially listened, position 318)` — PASS
- `is idempotent (running seed twice produces same counts)` — PASS

---

### Task 4: Final Verification and Commit

**Files:**
- None (verification only)

**Step 1: Run full test suite**

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run
```

Expected: all tests pass (both `db.test.ts` and `seed.test.ts`).

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Run linter**

```bash
npx eslint src/lib/seed.test.ts prisma/seed.ts
```

Expected: zero warnings/errors.

**Step 4: Verify Prisma Studio shows correct data**

```bash
npx prisma studio
```

Open http://localhost:5555 and verify:
- 1 user (`default-user`)
- 3 content records (Second Brain/epub/8420, Paul Graham/url/4200, Stripe/pdf/12000)
- 3 scripts (narrator 15min, conversation 8min, narrator 22min)
- 3 audio records (768s, 495s, 1350s)
- 1 playback state (position: 318, completed: false)

**Step 5: Commit**

```bash
git add prisma/seed.ts src/lib/seed.test.ts package.json
git commit -m "feat: seed script with sample content, scripts, audio, and playback data"
```

---

## Acceptance Criteria Checklist

- [ ] `npx prisma db seed` runs without errors
- [ ] Prints `Seeded user: default-user` and item counts
- [ ] Prisma Studio shows: 1 user, 3 content, 3 scripts, 3 audio, 1 playback state
- [ ] Seed is idempotent (running twice produces same counts, no errors)
- [ ] All 6 integration tests pass
- [ ] TypeScript compiles cleanly (`tsc --noEmit`)
- [ ] ESLint passes on both files
- [ ] Commit message: `feat: seed script with sample content, scripts, audio, and playback data`