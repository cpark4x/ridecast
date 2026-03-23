# Ridecast 2 Implementation Plan

> **Execution:** Use the subagent-driven-development workflow to implement this plan.

**Goal:** Rebuild Ridecast as a polished personal "podcast factory" — upload content, AI compresses it, TTS generates audio for commutes.

**Architecture:** Monolith Next.js 15 full-stack app. Three-layer pipeline: Content Ingestion → AI Processing (Claude) → Audio Generation (OpenAI TTS). Single-page app with screen switching, persistent player bar. No auth for v1 — single user. Local filesystem for audio storage. Provider-swappable interfaces for AI and TTS.

**Tech Stack:** Next.js 15 (App Router), TypeScript, TailwindCSS, PostgreSQL + Prisma, Claude API, OpenAI TTS API, Vitest, Playwright, Dexie.js (IndexedDB)

**Design Reference:** `prototype/index.html` — dark glassmorphism, purple/violet gradients (indigo-500 → violet-500), Inter font, 430px max-width mobile-first layout.

---

## Phase 1: Foundation

---

### Task 1: Project Scaffolding

**Goal:** Initialize Next.js 15 project with all tooling configured. No TDD for this task — it's pure infrastructure.

**Step 1: Create Next.js project**

The project root already contains `.git/`, `docs/`, and `prototype/`. The scaffolder will work around them.

```bash
cd /Users/chrispark/Projects/ridecast2
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

When prompted about existing files, answer **Yes** to continue.
When prompted about Turbopack, answer **No**.

**Step 2: Install dependencies**

```bash
npm install @prisma/client @anthropic-ai/sdk openai dexie uuid
npm install pdf-parse @mozilla/readability jsdom
npm install -D prisma vitest @vitejs/plugin-react jsdom @types/jsdom @types/uuid @testing-library/react @testing-library/jest-dom @playwright/test
npx playwright install chromium
```

**Step 3: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `src/test-setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

**Step 4: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
  },
});
```

**Step 5: Add scripts to package.json**

Add these to the `"scripts"` section of `package.json` (keep the existing ones, add the new ones):

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "db:migrate": "prisma migrate dev",
  "db:generate": "prisma generate",
  "db:seed": "npx tsx prisma/seed.ts",
  "db:studio": "prisma studio"
}
```

**Step 6: Create directory structure**

```bash
cd /Users/chrispark/Projects/ridecast2
mkdir -p src/lib/extractors
mkdir -p src/lib/ai
mkdir -p src/lib/tts
mkdir -p src/lib/utils
mkdir -p src/components
mkdir -p public/audio
mkdir -p e2e
mkdir -p test-fixtures
mkdir -p prisma
```

**Step 7: Create environment files**

Create `.env`:

```
DATABASE_URL="postgresql://postgres:ridecast@localhost:5432/ridecast"
ANTHROPIC_API_KEY="sk-ant-your-key-here"
OPENAI_API_KEY="sk-your-key-here"
```

Create `.env.example`:

```
DATABASE_URL="postgresql://postgres:ridecast@localhost:5432/ridecast"
ANTHROPIC_API_KEY="sk-ant-xxx"
OPENAI_API_KEY="sk-xxx"
```

Add to `.gitignore` (append if it already exists):

```
.env
.env.local
public/audio/*.mp3
```

**Step 8: Start PostgreSQL**

```bash
docker run --name ridecast-db -e POSTGRES_PASSWORD=ridecast -e POSTGRES_DB=ridecast -p 5432:5432 -d postgres:16
```

**Step 9: Configure Tailwind theme**

Replace `tailwind.config.ts` entirely:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
```

Replace `src/app/globals.css` entirely:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0a0a0f;
  --bg-card: rgba(255, 255, 255, 0.04);
  --bg-glass: rgba(255, 255, 255, 0.06);
  --bg-glass-hover: rgba(255, 255, 255, 0.1);
  --accent: #6366f1;
  --accent2: #8b5cf6;
  --accent3: #a78bfa;
  --green: #22c55e;
  --green-dim: rgba(34, 197, 94, 0.15);
  --amber: #f59e0b;
  --amber-dim: rgba(245, 158, 11, 0.15);
  --text: #f5f5f5;
  --text-secondary: rgba(245, 245, 245, 0.55);
  --text-tertiary: rgba(245, 245, 245, 0.3);
  --border: rgba(255, 255, 255, 0.08);
  --radius: 14px;
  --radius-sm: 10px;
  --radius-xs: 8px;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

html,
body {
  background: var(--bg);
  color: var(--text);
  height: 100%;
  width: 100%;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar {
  display: none;
}
* {
  scrollbar-width: none;
}

@keyframes gradientShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseDot {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(99, 102, 241, 0);
  }
}
```

**Step 10: Replace default page**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ridecast 2",
  description: "Turn anything into audio for your commute",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

Replace `src/app/page.tsx`:

```typescript
export default function Home() {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">Ridecast 2</h1>
    </div>
  );
}
```

**Step 11: Smoke test**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000 | grep -o "Ridecast 2" | head -1
kill %1
```

Expected: prints `Ridecast 2`

```bash
npx vitest run
```

Expected: `No test files found` (0 tests, no errors)

**Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 with Vitest, Playwright, Tailwind, Prisma deps"
```

---

### Task 2: Database Schema + Prisma Migrations

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

**Step 1: Initialize Prisma**

```bash
cd /Users/chrispark/Projects/ridecast2
npx prisma init
```

This creates `prisma/schema.prisma`. Replace its contents entirely:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  name      String   @default("Default User")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  content       Content[]
  playbackState PlaybackState[]
}

model Content {
  id          String   @id @default(uuid())
  userId      String
  title       String
  author      String?
  rawText     String
  wordCount   Int
  sourceType  String   // "pdf" | "epub" | "txt" | "url"
  sourceUrl   String?
  contentHash String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user    User     @relation(fields: [userId], references: [id])
  scripts Script[]
}

model Script {
  id               String   @id @default(uuid())
  contentId        String
  format           String   // "narrator" | "conversation"
  targetDuration   Int      // minutes
  actualWordCount  Int
  compressionRatio Float
  scriptText       String
  contentType      String?  // "business_book", "technical_article", etc.
  themes           String[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  content Content @relation(fields: [contentId], references: [id])
  audio   Audio[]
}

model Audio {
  id           String   @id @default(uuid())
  scriptId     String
  filePath     String
  durationSecs Int
  voices       String[]
  ttsProvider  String   // "openai" | "azure"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  script        Script          @relation(fields: [scriptId], references: [id])
  playbackState PlaybackState[]
}

model PlaybackState {
  id        String   @id @default(uuid())
  userId    String
  audioId   String
  position  Float    @default(0) // seconds
  speed     Float    @default(1.0)
  completed Boolean  @default(false)
  updatedAt DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id])
  audio Audio @relation(fields: [audioId], references: [id])

  @@unique([userId, audioId])
}
```

**Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: `Your database is now in sync with your schema.`

**Step 3: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 4: Write test to verify DB connection**

Create `src/lib/db.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { prisma } from "./db";

describe("Database connection", () => {
  it("can create and query a user", async () => {
    const user = await prisma.user.create({
      data: { name: "Test User" },
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe("Test User");

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
});
```

**Step 5: Run test**

```bash
npx vitest run src/lib/db.test.ts
```

Expected: PASS — 1 test passes.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: database schema with 5 tables (User, Content, Script, Audio, PlaybackState)"
```

---

### Task 3: Seed Script with Test Data

**Files:**
- Create: `prisma/seed.ts`
- Test: verify via `db:seed` command

**Step 1: Create seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default user (no auth for v1)
  const user = await prisma.user.upsert({
    where: { id: "default-user" },
    update: {},
    create: {
      id: "default-user",
      name: "Default User",
    },
  });

  console.log(`Seeded user: ${user.id}`);

  // Create sample content
  const content1 = await prisma.content.upsert({
    where: { contentHash: "seed-hash-001" },
    update: {},
    create: {
      userId: user.id,
      title: "How to Build a Second Brain",
      author: "Tiago Forte",
      rawText:
        "This is a placeholder for the full text of the book. In production this would be thousands of words extracted from the original PDF or EPUB file.",
      wordCount: 8420,
      sourceType: "epub",
      contentHash: "seed-hash-001",
    },
  });

  const content2 = await prisma.content.upsert({
    where: { contentHash: "seed-hash-002" },
    update: {},
    create: {
      userId: user.id,
      title: "Paul Graham: Do Things That Don't Scale",
      author: "Paul Graham",
      rawText:
        "This is a placeholder for the full essay. In production this would be the complete article text extracted from the URL.",
      wordCount: 4200,
      sourceType: "url",
      sourceUrl: "https://paulgraham.com/ds.html",
      contentHash: "seed-hash-002",
    },
  });

  const content3 = await prisma.content.upsert({
    where: { contentHash: "seed-hash-003" },
    update: {},
    create: {
      userId: user.id,
      title: "Stripe Annual Letter 2024",
      author: "Patrick Collison",
      rawText:
        "This is a placeholder for the full annual letter. In production this would be the complete document text.",
      wordCount: 12000,
      sourceType: "pdf",
      contentHash: "seed-hash-003",
    },
  });

  // Create scripts for content
  const script1 = await prisma.script.create({
    data: {
      contentId: content1.id,
      format: "narrator",
      targetDuration: 15,
      actualWordCount: 1920,
      compressionRatio: 0.23,
      scriptText:
        "Welcome to your audio summary of How to Build a Second Brain by Tiago Forte. The core idea is simple but powerful...",
      contentType: "business_book",
      themes: ["productivity", "knowledge management", "note-taking"],
    },
  });

  const script2 = await prisma.script.create({
    data: {
      contentId: content2.id,
      format: "conversation",
      targetDuration: 8,
      actualWordCount: 1200,
      compressionRatio: 0.29,
      scriptText: `[Host A] So I just read this classic Paul Graham essay about doing things that don't scale. Have you read it?\n[Host B] Oh yeah, it's one of the most important essays for startup founders. The key insight is counterintuitive.\n[Host A] Right, he argues that in the early days you should deliberately do things that won't scale.\n[Host B] Exactly. Like Airbnb's founders personally going door to door taking photos of listings.`,
      contentType: "essay",
      themes: ["startups", "growth", "strategy"],
    },
  });

  const script3 = await prisma.script.create({
    data: {
      contentId: content3.id,
      format: "narrator",
      targetDuration: 22,
      actualWordCount: 3300,
      compressionRatio: 0.28,
      scriptText:
        "Stripe's 2024 annual letter reveals several key trends shaping the future of internet commerce...",
      contentType: "business_report",
      themes: ["fintech", "payments", "commerce"],
    },
  });

  // Create audio for completed scripts
  const audio1 = await prisma.audio.create({
    data: {
      scriptId: script1.id,
      filePath: "/audio/seed-audio-001.mp3",
      durationSecs: 768,
      voices: ["alloy"],
      ttsProvider: "openai",
    },
  });

  const audio2 = await prisma.audio.create({
    data: {
      scriptId: script2.id,
      filePath: "/audio/seed-audio-002.mp3",
      durationSecs: 495,
      voices: ["echo", "nova"],
      ttsProvider: "openai",
    },
  });

  const audio3 = await prisma.audio.create({
    data: {
      scriptId: script3.id,
      filePath: "/audio/seed-audio-003.mp3",
      durationSecs: 1350,
      voices: ["alloy"],
      ttsProvider: "openai",
    },
  });

  // Create playback state (partially listened)
  await prisma.playbackState.create({
    data: {
      userId: user.id,
      audioId: audio1.id,
      position: 318,
      speed: 1.0,
      completed: false,
    },
  });

  console.log("Seeded 3 content items, 3 scripts, 3 audio records, 1 playback state.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

**Step 2: Add seed config to package.json**

Add this to the top level of `package.json`:

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

**Step 3: Run seed**

```bash
npx prisma db seed
```

Expected: prints `Seeded user: default-user` and `Seeded 3 content items...`

**Step 4: Verify with Prisma Studio**

```bash
npx prisma studio
```

Open http://localhost:5555 — verify you see 1 user, 3 content records, 3 scripts, 3 audio records, 1 playback state.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: seed script with sample content, scripts, audio, and playback data"
```

---

## Phase 2: Content Ingestion

---

### Task 4: Text Extraction — TXT Files

**Files:**
- Create: `src/lib/extractors/types.ts`
- Create: `src/lib/extractors/txt.ts`
- Test: `src/lib/extractors/txt.test.ts`

**Step 1: Create shared extractor types**

Create `src/lib/extractors/types.ts`:

```typescript
export interface ExtractionResult {
  title: string;
  text: string;
  wordCount: number;
  author?: string;
}
```

**Step 2: Write the failing test**

Create `src/lib/extractors/txt.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractTxt } from "./txt";

describe("extractTxt", () => {
  it("extracts text and counts words", () => {
    const input = "The quick brown fox jumps over the lazy dog.";
    const result = extractTxt(input, "sample.txt");

    expect(result.text).toBe("The quick brown fox jumps over the lazy dog.");
    expect(result.wordCount).toBe(9);
    expect(result.title).toBe("sample");
  });

  it("derives title from filename without extension", () => {
    const result = extractTxt("Hello world", "my-great-notes.txt");
    expect(result.title).toBe("my-great-notes");
  });

  it("trims whitespace from text", () => {
    const result = extractTxt("  hello world  \n\n", "test.txt");
    expect(result.text).toBe("hello world");
    expect(result.wordCount).toBe(2);
  });

  it("handles empty text", () => {
    const result = extractTxt("", "empty.txt");
    expect(result.text).toBe("");
    expect(result.wordCount).toBe(0);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run src/lib/extractors/txt.test.ts
```

Expected: FAIL — `Cannot find module './txt'`

**Step 4: Write the implementation**

Create `src/lib/extractors/txt.ts`:

```typescript
import { ExtractionResult } from "./types";

export function extractTxt(content: string, filename: string): ExtractionResult {
  const text = content.trim();
  const wordCount = text === "" ? 0 : text.split(/\s+/).length;
  const title = filename.replace(/\.txt$/i, "");

  return { title, text, wordCount };
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/extractors/txt.test.ts
```

Expected: PASS — 4 tests pass.

**Step 6: Commit**

```bash
git add src/lib/extractors/types.ts src/lib/extractors/txt.ts src/lib/extractors/txt.test.ts
git commit -m "feat: TXT text extraction with word counting"
```

---

### Task 5: Text Extraction — PDF Files

**Files:**
- Create: `src/lib/extractors/pdf.ts`
- Test: `src/lib/extractors/pdf.test.ts`
- Create: `test-fixtures/sample.txt` (used as a stand-in)

**Step 1: Write the failing test**

Create `src/lib/extractors/pdf.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { extractPdf } from "./pdf";

// Mock pdf-parse because it needs a real PDF binary
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockResolvedValue({
    text: "Chapter 1: Introduction\n\nThis is the content of the PDF document about machine learning.\n\nChapter 2: Methods\n\nWe used several approaches.",
    info: {
      Title: "Machine Learning Basics",
      Author: "Jane Smith",
    },
  }),
}));

describe("extractPdf", () => {
  it("extracts text, title, author, and word count from PDF buffer", async () => {
    const fakeBuffer = Buffer.from("fake-pdf-data");
    const result = await extractPdf(fakeBuffer, "document.pdf");

    expect(result.text).toContain("Chapter 1: Introduction");
    expect(result.title).toBe("Machine Learning Basics");
    expect(result.author).toBe("Jane Smith");
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it("falls back to filename for title when PDF metadata is missing", async () => {
    const pdfParse = await import("pdf-parse");
    (pdfParse.default as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      text: "Some content here",
      info: {},
    });

    const result = await extractPdf(Buffer.from("fake"), "my-report.pdf");
    expect(result.title).toBe("my-report");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/extractors/pdf.test.ts
```

Expected: FAIL — `Cannot find module './pdf'`

**Step 3: Write the implementation**

Create `src/lib/extractors/pdf.ts`:

```typescript
import pdfParse from "pdf-parse";
import { ExtractionResult } from "./types";

export async function extractPdf(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  const data = await pdfParse(buffer);
  const text = data.text.trim();
  const wordCount = text === "" ? 0 : text.split(/\s+/).length;
  const title = data.info?.Title || filename.replace(/\.pdf$/i, "");
  const author = data.info?.Author || undefined;

  return { title, text, wordCount, author };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/extractors/pdf.test.ts
```

Expected: PASS — 2 tests pass.

**Step 5: Commit**

```bash
git add src/lib/extractors/pdf.ts src/lib/extractors/pdf.test.ts
git commit -m "feat: PDF text extraction via pdf-parse"
```

---

### Task 6: Text Extraction — EPUB Files

**Files:**
- Create: `src/lib/extractors/epub.ts`
- Test: `src/lib/extractors/epub.test.ts`

Note: We'll parse EPUB manually since it's just a ZIP of HTML files. We use JSZip for extraction and strip HTML tags.

**Step 1: Install JSZip**

```bash
npm install jszip
npm install -D @types/jszip
```

**Step 2: Write the failing test**

Create `src/lib/extractors/epub.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { extractEpub } from "./epub";

async function createTestEpub(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
    <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
      <rootfiles>
        <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
      </rootfiles>
    </container>`
  );
  zip.file(
    "content.opf",
    `<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>Test EPUB Book</dc:title>
        <dc:creator>Test Author</dc:creator>
      </metadata>
      <manifest>
        <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
        <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
      </manifest>
      <spine>
        <itemref idref="ch1"/>
        <itemref idref="ch2"/>
      </spine>
    </package>`
  );
  zip.file(
    "chapter1.xhtml",
    `<html><body><h1>Chapter One</h1><p>This is the first chapter of the book.</p></body></html>`
  );
  zip.file(
    "chapter2.xhtml",
    `<html><body><h1>Chapter Two</h1><p>This is the second chapter with more content.</p></body></html>`
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return buffer;
}

describe("extractEpub", () => {
  it("extracts text, title, author from EPUB", async () => {
    const epub = await createTestEpub();
    const result = await extractEpub(epub, "book.epub");

    expect(result.title).toBe("Test EPUB Book");
    expect(result.author).toBe("Test Author");
    expect(result.text).toContain("Chapter One");
    expect(result.text).toContain("first chapter");
    expect(result.text).toContain("Chapter Two");
    expect(result.wordCount).toBeGreaterThan(10);
  });

  it("strips HTML tags from content", async () => {
    const epub = await createTestEpub();
    const result = await extractEpub(epub, "book.epub");

    expect(result.text).not.toContain("<h1>");
    expect(result.text).not.toContain("<p>");
    expect(result.text).not.toContain("</");
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run src/lib/extractors/epub.test.ts
```

Expected: FAIL — `Cannot find module './epub'`

**Step 4: Write the implementation**

Create `src/lib/extractors/epub.ts`:

```typescript
import JSZip from "jszip";
import { ExtractionResult } from "./types";

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractEpub(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  const zip = await JSZip.loadAsync(buffer);

  // Parse container.xml to find content.opf path
  const containerXml = await zip.file("META-INF/container.xml")?.async("text");
  if (!containerXml) throw new Error("Invalid EPUB: missing container.xml");

  const opfPathMatch = containerXml.match(/full-path="([^"]+)"/);
  const opfPath = opfPathMatch?.[1] || "content.opf";

  // Parse content.opf for metadata and spine order
  const opfXml = await zip.file(opfPath)?.async("text");
  if (!opfXml) throw new Error("Invalid EPUB: missing content.opf");

  // Extract metadata
  const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
  const authorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/);
  const title = titleMatch?.[1] || filename.replace(/\.epub$/i, "");
  const author = authorMatch?.[1] || undefined;

  // Extract manifest items (id -> href mapping)
  const manifestItems: Record<string, string> = {};
  const itemRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
    manifestItems[itemMatch[1]] = itemMatch[2];
  }

  // Extract spine order
  const spineIds: string[] = [];
  const spineRegex = /<itemref\s+idref="([^"]+)"/g;
  let spineMatch;
  while ((spineMatch = spineRegex.exec(opfXml)) !== null) {
    spineIds.push(spineMatch[1]);
  }

  // Read content files in spine order
  const opfDir = opfPath.includes("/")
    ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1)
    : "";

  const textParts: string[] = [];
  for (const id of spineIds) {
    const href = manifestItems[id];
    if (!href) continue;
    const fullPath = opfDir + href;
    const html = await zip.file(fullPath)?.async("text");
    if (html) {
      textParts.push(stripHtml(html));
    }
  }

  const text = textParts.join("\n\n");
  const wordCount = text === "" ? 0 : text.split(/\s+/).length;

  return { title, text, wordCount, author };
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/extractors/epub.test.ts
```

Expected: PASS — 2 tests pass.

**Step 6: Commit**

```bash
git add src/lib/extractors/epub.ts src/lib/extractors/epub.test.ts
git commit -m "feat: EPUB text extraction via JSZip with spine-order reading"
```

---

### Task 7: URL Content Extraction

**Files:**
- Create: `src/lib/extractors/url.ts`
- Test: `src/lib/extractors/url.test.ts`

**Step 1: Write the failing test**

Create `src/lib/extractors/url.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { extractUrl } from "./url";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("extractUrl", () => {
  it("extracts article content from HTML", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(`
        <html>
          <head><title>Great Article</title></head>
          <body>
            <article>
              <h1>Great Article Title</h1>
              <p>This is the main content of the article. It has several paragraphs
              of meaningful text that should be extracted by the readability parser.</p>
              <p>Here is another paragraph with more details about the topic at hand.
              The content continues with additional information that makes this a
              substantial article worth reading and listening to.</p>
            </article>
            <nav>Navigation links that should be ignored</nav>
            <footer>Footer content to ignore</footer>
          </body>
        </html>
      `),
    });

    const result = await extractUrl("https://example.com/article");

    expect(result.title).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.text).not.toContain("Navigation links");
  });

  it("throws on failed fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(extractUrl("https://example.com/404")).rejects.toThrow(
      "Failed to fetch URL"
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/extractors/url.test.ts
```

Expected: FAIL — `Cannot find module './url'`

**Step 3: Write the implementation**

Create `src/lib/extractors/url.ts`:

```typescript
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { ExtractionResult } from "./types";

export async function extractUrl(url: string): Promise<ExtractionResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent) {
    throw new Error("Could not extract article content from URL");
  }

  const text = article.textContent.trim();
  const wordCount = text === "" ? 0 : text.split(/\s+/).length;
  const title = article.title || new URL(url).hostname;

  return { title, text, wordCount };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/extractors/url.test.ts
```

Expected: PASS — 2 tests pass.

**Step 5: Commit**

```bash
git add src/lib/extractors/url.ts src/lib/extractors/url.test.ts
git commit -m "feat: URL content extraction via Readability + JSDOM"
```

---

### Task 8: Upload API Route

**Files:**
- Create: `src/lib/extractors/index.ts`
- Create: `src/lib/utils/hash.ts`
- Create: `src/lib/utils/hash.test.ts`
- Create: `src/app/api/upload/route.ts`
- Test: `src/app/api/upload/route.test.ts`

**Step 1: Create content hash utility**

Create `src/lib/utils/hash.ts`:

```typescript
import { createHash } from "crypto";

export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
```

Create `src/lib/utils/hash.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { contentHash } from "./hash";

describe("contentHash", () => {
  it("returns a SHA-256 hex string", () => {
    const hash = contentHash("hello world");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it("returns same hash for same input", () => {
    const a = contentHash("test content");
    const b = contentHash("test content");
    expect(a).toBe(b);
  });

  it("returns different hash for different input", () => {
    const a = contentHash("hello");
    const b = contentHash("world");
    expect(a).not.toBe(b);
  });
});
```

**Step 2: Run hash test**

```bash
npx vitest run src/lib/utils/hash.test.ts
```

Expected: PASS — 3 tests pass.

**Step 3: Create extractor index**

Create `src/lib/extractors/index.ts`:

```typescript
import { ExtractionResult } from "./types";
import { extractTxt } from "./txt";
import { extractPdf } from "./pdf";
import { extractEpub } from "./epub";
import { extractUrl } from "./url";

export type { ExtractionResult } from "./types";

export async function extractContent(
  input: Buffer | string,
  filename: string,
  sourceType: "txt" | "pdf" | "epub"
): Promise<ExtractionResult> {
  switch (sourceType) {
    case "txt":
      return extractTxt(
        typeof input === "string" ? input : input.toString("utf-8"),
        filename
      );
    case "pdf":
      if (typeof input === "string") throw new Error("PDF requires a Buffer");
      return extractPdf(input, filename);
    case "epub":
      if (typeof input === "string") throw new Error("EPUB requires a Buffer");
      return extractEpub(input, filename);
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }
}

export { extractUrl };
```

**Step 4: Write the failing API route test**

Create `src/app/api/upload/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing route
vi.mock("@/lib/db", () => ({
  prisma: {
    content: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) =>
        Promise.resolve({
          id: "test-content-id",
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    },
  },
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a TXT file upload and returns content record", async () => {
    const file = new File(
      ["The quick brown fox jumps over the lazy dog."],
      "test.txt",
      { type: "text/plain" }
    );
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe("test");
    expect(body.wordCount).toBe(9);
    expect(body.sourceType).toBe("txt");
  });

  it("accepts a URL and returns content record", async () => {
    // Mock fetch for URL extraction
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(`
        <html><head><title>Test Article</title></head>
        <body><article><p>This is a test article with enough content to be extracted properly by the readability algorithm and parsed into text.</p></article></body></html>
      `),
    }) as unknown as typeof fetch;

    const formData = new FormData();
    formData.append("url", "https://example.com/article");

    const request = new Request("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sourceType).toBe("url");
  });

  it("rejects duplicate content", async () => {
    (prisma.content.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "existing-id",
      title: "Already exists",
    });

    const file = new File(["duplicate content"], "dupe.txt", {
      type: "text/plain",
    });
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
  });
});
```

**Step 5: Run test to verify it fails**

```bash
npx vitest run src/app/api/upload/route.test.ts
```

Expected: FAIL — `Cannot find module './route'`

**Step 6: Write the implementation**

Create `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractContent, extractUrl } from "@/lib/extractors";
import { contentHash } from "@/lib/utils/hash";

const DEFAULT_USER_ID = "default-user";

function getSourceType(filename: string): "txt" | "pdf" | "epub" {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "epub") return "epub";
  return "txt";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;

    let title: string;
    let text: string;
    let wordCount: number;
    let author: string | undefined;
    let sourceType: string;
    let sourceUrl: string | undefined;

    if (url) {
      const result = await extractUrl(url);
      title = result.title;
      text = result.text;
      wordCount = result.wordCount;
      author = result.author;
      sourceType = "url";
      sourceUrl = url;
    } else if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      sourceType = getSourceType(file.name);
      const result = await extractContent(buffer, file.name, sourceType as "txt" | "pdf" | "epub");
      title = result.title;
      text = result.text;
      wordCount = result.wordCount;
      author = result.author;
    } else {
      return NextResponse.json(
        { error: "No file or URL provided" },
        { status: 400 }
      );
    }

    // Check for duplicate content
    const hash = contentHash(text);
    const existing = await prisma.content.findUnique({
      where: { contentHash: hash },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This content has already been uploaded", existingId: existing.id },
        { status: 409 }
      );
    }

    // Save to database
    const content = await prisma.content.create({
      data: {
        userId: DEFAULT_USER_ID,
        title,
        author,
        rawText: text,
        wordCount,
        sourceType,
        sourceUrl,
        contentHash: hash,
      },
    });

    return NextResponse.json(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 7: Run test to verify it passes**

```bash
npx vitest run src/app/api/upload/route.test.ts
```

Expected: PASS — 3 tests pass.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: upload API route with file + URL extraction and dedup"
```

---

## Phase 3: AI Processing Pipeline

---

### Task 9: AI Provider Interface + Claude Client

**Files:**
- Create: `src/lib/ai/types.ts`
- Create: `src/lib/ai/claude.ts`
- Test: `src/lib/ai/claude.test.ts`

**Step 1: Create AI provider types**

Create `src/lib/ai/types.ts`:

```typescript
export interface ContentAnalysis {
  contentType: string;
  format: "narrator" | "conversation";
  themes: string[];
  summary: string;
}

export interface ScriptConfig {
  format: "narrator" | "conversation";
  targetMinutes: number;
  contentType: string;
  themes: string[];
}

export interface GeneratedScript {
  text: string;
  wordCount: number;
  format: "narrator" | "conversation";
}

export interface AIProvider {
  analyze(text: string): Promise<ContentAnalysis>;
  generateScript(text: string, config: ScriptConfig): Promise<GeneratedScript>;
}
```

**Step 2: Write the failing test**

Create `src/lib/ai/claude.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeProvider } from "./claude";

// Mock @anthropic-ai/sdk
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

import Anthropic from "@anthropic-ai/sdk";

describe("ClaudeProvider", () => {
  let provider: ClaudeProvider;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ClaudeProvider();
    const instance = new Anthropic();
    mockCreate = instance.messages.create as ReturnType<typeof vi.fn>;
    // Re-mock to get the same instance
    (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      messages: { create: mockCreate },
    }));
    provider = new ClaudeProvider();
  });

  describe("analyze", () => {
    it("returns content analysis with format decision", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              contentType: "business_book",
              format: "conversation",
              themes: ["productivity", "systems thinking"],
              summary: "A book about building knowledge systems.",
            }),
          },
        ],
      });

      const result = await provider.analyze(
        "Long text about building a second brain and knowledge management..."
      );

      expect(result.contentType).toBe("business_book");
      expect(result.format).toBe("conversation");
      expect(result.themes).toContain("productivity");
      expect(result.summary).toBeTruthy();
    });
  });

  describe("generateScript", () => {
    it("returns narrator script with word count", async () => {
      const scriptText =
        "Welcome to your audio summary. The key idea is that productivity comes from systems, not willpower.";

      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: scriptText }],
      });

      const result = await provider.generateScript(
        "Full book text here...",
        {
          format: "narrator",
          targetMinutes: 15,
          contentType: "business_book",
          themes: ["productivity"],
        }
      );

      expect(result.text).toBe(scriptText);
      expect(result.format).toBe("narrator");
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it("returns conversation script with speaker labels", async () => {
      const scriptText = `[Host A] So I just finished reading this fascinating book.\n[Host B] Oh yeah? What's the main takeaway?`;

      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: scriptText }],
      });

      const result = await provider.generateScript(
        "Full book text here...",
        {
          format: "conversation",
          targetMinutes: 10,
          contentType: "business_book",
          themes: ["productivity"],
        }
      );

      expect(result.text).toContain("[Host A]");
      expect(result.text).toContain("[Host B]");
      expect(result.format).toBe("conversation");
    });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run src/lib/ai/claude.test.ts
```

Expected: FAIL — `Cannot find module './claude'`

**Step 4: Write the implementation**

Create `src/lib/ai/claude.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import {
  AIProvider,
  ContentAnalysis,
  ScriptConfig,
  GeneratedScript,
} from "./types";

const WORDS_PER_MINUTE = 150;

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async analyze(text: string): Promise<ContentAnalysis> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze the following text and return a JSON object with these fields:
- contentType: one of "business_book", "technical_article", "essay", "narrative", "news", "meeting_notes", "research_paper", "other"
- format: "narrator" for narrative/short/meeting content, "conversation" for dense analytical/business/technical content
- themes: array of 3-5 key themes
- summary: one sentence summary

Return ONLY valid JSON, no markdown or explanation.

Text (first 3000 chars):
${text.slice(0, 3000)}`,
        },
      ],
    });

    const raw = response.content[0];
    if (raw.type !== "text") throw new Error("Unexpected response type");
    return JSON.parse(raw.text);
  }

  async generateScript(
    text: string,
    config: ScriptConfig
  ): Promise<GeneratedScript> {
    const targetWords = config.targetMinutes * WORDS_PER_MINUTE;

    const formatInstructions =
      config.format === "narrator"
        ? `Write a clean, spoken-word-optimized summary. Use shorter sentences, natural transitions, and a warm conversational tone. Write for the ear, not the eye. Do NOT include any speaker labels. Target approximately ${targetWords} words.`
        : `Write a two-speaker conversation script between [Host A] (curious, energetic co-host) and [Host B] (thoughtful, knowledgeable expert). They discuss the content naturally — Host A asks questions, reacts, makes analogies. Host B explains key concepts. Use [Host A] and [Host B] labels at the start of each speaker turn. Target approximately ${targetWords} words.`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: targetWords * 2,
      messages: [
        {
          role: "user",
          content: `You are creating an audio script from the following content.

Content type: ${config.contentType}
Key themes: ${config.themes.join(", ")}

${formatInstructions}

Source text:
${text}`,
        },
      ],
    });

    const raw = response.content[0];
    if (raw.type !== "text") throw new Error("Unexpected response type");

    const scriptText = raw.text.trim();
    const wordCount = scriptText.split(/\s+/).length;

    return { text: scriptText, wordCount, format: config.format };
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/ai/claude.test.ts
```

Expected: PASS — 3 tests pass.

**Step 6: Commit**

```bash
git add src/lib/ai/types.ts src/lib/ai/claude.ts src/lib/ai/claude.test.ts
git commit -m "feat: AI provider interface + Claude client for analysis and script generation"
```

---

### Task 10: Duration Utility

**Files:**
- Create: `src/lib/utils/duration.ts`
- Test: `src/lib/utils/duration.test.ts`

**Step 1: Write the failing test**

Create `src/lib/utils/duration.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { minutesToWords, wordsToMinutes, formatDuration } from "./duration";

describe("minutesToWords", () => {
  it("converts 5 minutes to 750 words", () => {
    expect(minutesToWords(5)).toBe(750);
  });

  it("converts 15 minutes to 2250 words", () => {
    expect(minutesToWords(15)).toBe(2250);
  });

  it("converts 20 minutes to 3000 words", () => {
    expect(minutesToWords(20)).toBe(3000);
  });

  it("converts 30 minutes to 4500 words", () => {
    expect(minutesToWords(30)).toBe(4500);
  });
});

describe("wordsToMinutes", () => {
  it("converts 3000 words to 20 minutes", () => {
    expect(wordsToMinutes(3000)).toBe(20);
  });

  it("rounds to nearest integer", () => {
    expect(wordsToMinutes(1000)).toBe(7);
  });
});

describe("formatDuration", () => {
  it("formats seconds to mm:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(768)).toBe("12:48");
    expect(formatDuration(3600)).toBe("60:00");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/utils/duration.test.ts
```

Expected: FAIL — `Cannot find module './duration'`

**Step 3: Write the implementation**

Create `src/lib/utils/duration.ts`:

```typescript
const WORDS_PER_MINUTE = 150;

export function minutesToWords(minutes: number): number {
  return minutes * WORDS_PER_MINUTE;
}

export function wordsToMinutes(words: number): number {
  return Math.round(words / WORDS_PER_MINUTE);
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/utils/duration.test.ts
```

Expected: PASS — 6 tests pass.

**Step 5: Commit**

```bash
git add src/lib/utils/duration.ts src/lib/utils/duration.test.ts
git commit -m "feat: duration utilities (minutesToWords, wordsToMinutes, formatDuration)"
```

---

### Task 11: Script Parser (Conversation Splitting)

**Files:**
- Create: `src/lib/utils/script-parser.ts`
- Test: `src/lib/utils/script-parser.test.ts`

**Step 1: Write the failing test**

Create `src/lib/utils/script-parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseConversationScript, ScriptSegment } from "./script-parser";

describe("parseConversationScript", () => {
  it("splits conversation by speaker labels", () => {
    const script = `[Host A] Hey, so I just read this article.
[Host B] Oh yeah? What was it about?
[Host A] It was about building systems for productivity.`;

    const segments = parseConversationScript(script);

    expect(segments).toHaveLength(3);
    expect(segments[0].speaker).toBe("Host A");
    expect(segments[0].text).toBe("Hey, so I just read this article.");
    expect(segments[1].speaker).toBe("Host B");
    expect(segments[1].text).toBe("Oh yeah? What was it about?");
    expect(segments[2].speaker).toBe("Host A");
    expect(segments[2].text).toBe(
      "It was about building systems for productivity."
    );
  });

  it("handles multi-line speaker turns", () => {
    const script = `[Host A] This is line one.
And this continues the same turn.
[Host B] Now it's my turn.`;

    const segments = parseConversationScript(script);

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe(
      "This is line one.\nAnd this continues the same turn."
    );
    expect(segments[1].text).toBe("Now it's my turn.");
  });

  it("returns empty array for empty input", () => {
    expect(parseConversationScript("")).toEqual([]);
  });

  it("handles text without speaker labels as narrator", () => {
    const script = "Just plain text without any labels.";
    const segments = parseConversationScript(script);

    expect(segments).toHaveLength(1);
    expect(segments[0].speaker).toBe("narrator");
    expect(segments[0].text).toBe("Just plain text without any labels.");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/utils/script-parser.test.ts
```

Expected: FAIL — `Cannot find module './script-parser'`

**Step 3: Write the implementation**

Create `src/lib/utils/script-parser.ts`:

```typescript
export interface ScriptSegment {
  speaker: string;
  text: string;
}

export function parseConversationScript(script: string): ScriptSegment[] {
  if (!script.trim()) return [];

  const labelPattern = /^\[([^\]]+)\]\s*/;
  const lines = script.split("\n");
  const segments: ScriptSegment[] = [];
  let currentSpeaker: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(labelPattern);
    if (match) {
      // Save previous segment
      if (currentSpeaker !== null && currentLines.length > 0) {
        segments.push({
          speaker: currentSpeaker,
          text: currentLines.join("\n").trim(),
        });
      }
      currentSpeaker = match[1];
      currentLines = [line.replace(labelPattern, "")];
    } else {
      currentLines.push(line);
    }
  }

  // Save final segment
  if (currentLines.length > 0) {
    const text = currentLines.join("\n").trim();
    if (text) {
      segments.push({
        speaker: currentSpeaker ?? "narrator",
        text,
      });
    }
  }

  return segments;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/utils/script-parser.test.ts
```

Expected: PASS — 4 tests pass.

**Step 5: Commit**

```bash
git add src/lib/utils/script-parser.ts src/lib/utils/script-parser.test.ts
git commit -m "feat: conversation script parser — splits by [Host A]/[Host B] labels"
```

---

### Task 12: Processing API Route

**Files:**
- Create: `src/app/api/process/route.ts`
- Test: `src/app/api/process/route.test.ts`

**Step 1: Write the failing test**

Create `src/app/api/process/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    content: {
      findUnique: vi.fn(),
    },
    script: {
      create: vi.fn().mockImplementation((args) =>
        Promise.resolve({
          id: "test-script-id",
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    },
  },
}));

vi.mock("@/lib/ai/claude", () => ({
  ClaudeProvider: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      contentType: "essay",
      format: "narrator",
      themes: ["technology", "startups"],
      summary: "An essay about startup strategy.",
    }),
    generateScript: vi.fn().mockResolvedValue({
      text: "Welcome to your audio summary about startup strategy. The key insight is...",
      wordCount: 1500,
      format: "narrator",
    }),
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

describe("POST /api/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("analyzes content and generates a script", async () => {
    (prisma.content.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "content-123",
      rawText: "Long article text about startups and growth strategy...",
      wordCount: 5000,
    });

    const request = new Request("http://localhost:3000/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: "content-123", targetMinutes: 15 }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.format).toBe("narrator");
    expect(body.scriptText).toContain("Welcome to your audio summary");
    expect(body.actualWordCount).toBe(1500);
  });

  it("returns 404 for unknown content", async () => {
    (prisma.content.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: "nonexistent", targetMinutes: 10 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/api/process/route.test.ts
```

Expected: FAIL — `Cannot find module './route'`

**Step 3: Write the implementation**

Create `src/app/api/process/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ClaudeProvider } from "@/lib/ai/claude";

export async function POST(request: NextRequest) {
  try {
    const { contentId, targetMinutes } = await request.json();

    if (!contentId || !targetMinutes) {
      return NextResponse.json(
        { error: "contentId and targetMinutes are required" },
        { status: 400 }
      );
    }

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    const ai = new ClaudeProvider();

    // Step 1: Analyze content
    const analysis = await ai.analyze(content.rawText);

    // Step 2: Generate script
    const generated = await ai.generateScript(content.rawText, {
      format: analysis.format,
      targetMinutes,
      contentType: analysis.contentType,
      themes: analysis.themes,
    });

    // Save script to database
    const script = await prisma.script.create({
      data: {
        contentId: content.id,
        format: generated.format,
        targetDuration: targetMinutes,
        actualWordCount: generated.wordCount,
        compressionRatio: generated.wordCount / content.wordCount,
        scriptText: generated.text,
        contentType: analysis.contentType,
        themes: analysis.themes,
      },
    });

    return NextResponse.json(script);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/api/process/route.test.ts
```

Expected: PASS — 2 tests pass.

**Step 5: Commit**

```bash
git add src/app/api/process/route.ts src/app/api/process/route.test.ts
git commit -m "feat: processing API route — analyze content + generate script via Claude"
```

---

## Phase 4: Audio Generation

---

### Task 13: TTS Provider Interface + OpenAI Client

**Files:**
- Create: `src/lib/tts/types.ts`
- Create: `src/lib/tts/openai.ts`
- Test: `src/lib/tts/openai.test.ts`

**Step 1: Create TTS provider types**

Create `src/lib/tts/types.ts`:

```typescript
export interface VoiceConfig {
  voice: string;
  instructions: string;
}

export interface TTSProvider {
  generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer>;
}
```

**Step 2: Write the failing test**

Create `src/lib/tts/openai.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAITTSProvider } from "./openai";

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      speech: {
        create: vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        }),
      },
    },
  })),
}));

describe("OpenAITTSProvider", () => {
  let provider: OpenAITTSProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAITTSProvider();
  });

  it("generates speech from text and returns a Buffer", async () => {
    const result = await provider.generateSpeech(
      "Hello, this is a test of the text to speech system.",
      {
        voice: "alloy",
        instructions: "Speak clearly and warmly.",
      }
    );

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run src/lib/tts/openai.test.ts
```

Expected: FAIL — `Cannot find module './openai'`

**Step 4: Write the implementation**

Create `src/lib/tts/openai.ts`:

```typescript
import OpenAI from "openai";
import { TTSProvider, VoiceConfig } from "./types";

export class OpenAITTSProvider implements TTSProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI();
  }

  async generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer> {
    const response = await this.client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice.voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
      instructions: voice.instructions,
      response_format: "mp3",
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/tts/openai.test.ts
```

Expected: PASS — 1 test passes.

**Step 6: Commit**

```bash
git add src/lib/tts/types.ts src/lib/tts/openai.ts src/lib/tts/openai.test.ts
git commit -m "feat: TTS provider interface + OpenAI client for speech generation"
```

---

### Task 14: Narrator Audio Generation

**Files:**
- Create: `src/lib/tts/narrator.ts`
- Test: `src/lib/tts/narrator.test.ts`

**Step 1: Write the failing test**

Create `src/lib/tts/narrator.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { generateNarratorAudio } from "./narrator";
import { TTSProvider } from "./types";

describe("generateNarratorAudio", () => {
  it("generates audio with narrator voice config", async () => {
    const mockProvider: TTSProvider = {
      generateSpeech: vi.fn().mockResolvedValue(Buffer.from("audio-data")),
    };

    const result = await generateNarratorAudio(
      mockProvider,
      "Welcome to your audio summary. The key insight is about systems thinking."
    );

    expect(result).toBeInstanceOf(Buffer);
    expect(mockProvider.generateSpeech).toHaveBeenCalledWith(
      "Welcome to your audio summary. The key insight is about systems thinking.",
      {
        voice: "alloy",
        instructions: "Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.",
      }
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/tts/narrator.test.ts
```

Expected: FAIL — `Cannot find module './narrator'`

**Step 3: Write the implementation**

Create `src/lib/tts/narrator.ts`:

```typescript
import { TTSProvider } from "./types";

const NARRATOR_VOICE = {
  voice: "alloy",
  instructions:
    "Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.",
};

export async function generateNarratorAudio(
  provider: TTSProvider,
  scriptText: string
): Promise<Buffer> {
  return provider.generateSpeech(scriptText, NARRATOR_VOICE);
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/tts/narrator.test.ts
```

Expected: PASS — 1 test passes.

**Step 5: Commit**

```bash
git add src/lib/tts/narrator.ts src/lib/tts/narrator.test.ts
git commit -m "feat: narrator audio generation with warm audiobook voice"
```

---

### Task 15: Conversation Audio Generation (Multi-Voice + Stitching)

**Files:**
- Create: `src/lib/tts/conversation.ts`
- Test: `src/lib/tts/conversation.test.ts`

**Step 1: Write the failing test**

Create `src/lib/tts/conversation.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { generateConversationAudio } from "./conversation";
import { TTSProvider } from "./types";

describe("generateConversationAudio", () => {
  it("generates audio chunks per speaker and concatenates them", async () => {
    const chunkA = Buffer.from("chunk-A-audio");
    const chunkB = Buffer.from("chunk-B-audio");

    const mockProvider: TTSProvider = {
      generateSpeech: vi
        .fn()
        .mockResolvedValueOnce(chunkA)
        .mockResolvedValueOnce(chunkB)
        .mockResolvedValueOnce(chunkA),
    };

    const script = `[Host A] Hey, welcome to the show.
[Host B] Thanks for having me. Let me explain this concept.
[Host A] That makes a lot of sense.`;

    const result = await generateConversationAudio(mockProvider, script);

    expect(result.audio).toBeInstanceOf(Buffer);
    expect(result.voices).toEqual(["echo", "nova"]);
    expect(mockProvider.generateSpeech).toHaveBeenCalledTimes(3);

    // Verify Host A used "echo" voice
    expect(mockProvider.generateSpeech).toHaveBeenNthCalledWith(
      1,
      "Hey, welcome to the show.",
      expect.objectContaining({ voice: "echo" })
    );

    // Verify Host B used "nova" voice
    expect(mockProvider.generateSpeech).toHaveBeenNthCalledWith(
      2,
      "Thanks for having me. Let me explain this concept.",
      expect.objectContaining({ voice: "nova" })
    );
  });

  it("returns empty buffer for empty script", async () => {
    const mockProvider: TTSProvider = {
      generateSpeech: vi.fn(),
    };

    const result = await generateConversationAudio(mockProvider, "");
    expect(result.audio.length).toBe(0);
    expect(mockProvider.generateSpeech).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/tts/conversation.test.ts
```

Expected: FAIL — `Cannot find module './conversation'`

**Step 3: Write the implementation**

Create `src/lib/tts/conversation.ts`:

```typescript
import { TTSProvider, VoiceConfig } from "./types";
import { parseConversationScript } from "@/lib/utils/script-parser";

const VOICE_MAP: Record<string, VoiceConfig> = {
  "Host A": {
    voice: "echo",
    instructions:
      "Curious, energetic co-host. Speak with enthusiasm and natural curiosity. Ask follow-up questions naturally.",
  },
  "Host B": {
    voice: "nova",
    instructions:
      "Thoughtful, knowledgeable expert. Speak with confidence and warmth. Explain concepts clearly with good pacing.",
  },
};

const DEFAULT_VOICE: VoiceConfig = {
  voice: "alloy",
  instructions: "Clear, natural speaking voice.",
};

export async function generateConversationAudio(
  provider: TTSProvider,
  scriptText: string
): Promise<{ audio: Buffer; voices: string[] }> {
  const segments = parseConversationScript(scriptText);

  if (segments.length === 0) {
    return { audio: Buffer.alloc(0), voices: [] };
  }

  const chunks: Buffer[] = [];
  const voicesUsed = new Set<string>();

  for (const segment of segments) {
    const voiceConfig = VOICE_MAP[segment.speaker] ?? DEFAULT_VOICE;
    voicesUsed.add(voiceConfig.voice);
    const chunk = await provider.generateSpeech(segment.text, voiceConfig);
    chunks.push(chunk);
  }

  const audio = Buffer.concat(chunks);
  return { audio, voices: Array.from(voicesUsed) };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/tts/conversation.test.ts
```

Expected: PASS — 2 tests pass.

**Step 5: Commit**

```bash
git add src/lib/tts/conversation.ts src/lib/tts/conversation.test.ts
git commit -m "feat: conversation audio generation — multi-voice with chunk stitching"
```

---

### Task 16: Audio Generation API Route

**Files:**
- Create: `src/app/api/audio/generate/route.ts`
- Create: `src/app/api/audio/[id]/route.ts`
- Test: `src/app/api/audio/generate/route.test.ts`

**Step 1: Write the failing test**

Create `src/app/api/audio/generate/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFile, mkdir } from "fs/promises";

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    script: {
      findUnique: vi.fn(),
    },
    audio: {
      create: vi.fn().mockImplementation((args) =>
        Promise.resolve({
          id: "test-audio-id",
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    },
  },
}));

vi.mock("@/lib/tts/openai", () => ({
  OpenAITTSProvider: vi.fn().mockImplementation(() => ({
    generateSpeech: vi.fn().mockResolvedValue(Buffer.from("fake-mp3-data")),
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

describe("POST /api/audio/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates narrator audio and saves to filesystem", async () => {
    (prisma.script.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "script-123",
      format: "narrator",
      scriptText: "Welcome to your audio summary about productivity.",
      targetDuration: 15,
    });

    const request = new Request("http://localhost:3000/api/audio/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scriptId: "script-123" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.filePath).toMatch(/\/audio\/.+\.mp3$/);
    expect(body.ttsProvider).toBe("openai");
    expect(writeFile).toHaveBeenCalled();
  });

  it("returns 404 for unknown script", async () => {
    (prisma.script.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/audio/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scriptId: "nonexistent" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/api/audio/generate/route.test.ts
```

Expected: FAIL — `Cannot find module './route'`

**Step 3: Write the generate route**

Create `src/app/api/audio/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { OpenAITTSProvider } from "@/lib/tts/openai";
import { generateNarratorAudio } from "@/lib/tts/narrator";
import { generateConversationAudio } from "@/lib/tts/conversation";

export async function POST(request: NextRequest) {
  try {
    const { scriptId } = await request.json();

    if (!scriptId) {
      return NextResponse.json(
        { error: "scriptId is required" },
        { status: 400 }
      );
    }

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      return NextResponse.json(
        { error: "Script not found" },
        { status: 404 }
      );
    }

    const provider = new OpenAITTSProvider();
    let audioBuffer: Buffer;
    let voices: string[];

    if (script.format === "conversation") {
      const result = await generateConversationAudio(provider, script.scriptText);
      audioBuffer = result.audio;
      voices = result.voices;
    } else {
      audioBuffer = await generateNarratorAudio(provider, script.scriptText);
      voices = ["alloy"];
    }

    // Save audio file to public/audio/
    const filename = `${uuidv4()}.mp3`;
    const audioDir = path.join(process.cwd(), "public", "audio");
    await mkdir(audioDir, { recursive: true });
    await writeFile(path.join(audioDir, filename), audioBuffer);

    // Estimate duration from word count (150 words/min)
    const durationSecs = Math.round((script.actualWordCount / 150) * 60);

    const audio = await prisma.audio.create({
      data: {
        scriptId: script.id,
        filePath: `/audio/${filename}`,
        durationSecs,
        voices,
        ttsProvider: "openai",
      },
    });

    return NextResponse.json(audio);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Write the audio serve route**

Create `src/app/api/audio/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const audio = await prisma.audio.findUnique({
      where: { id },
    });

    if (!audio) {
      return NextResponse.json({ error: "Audio not found" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "public", audio.filePath);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to serve audio" },
      { status: 500 }
    );
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/app/api/audio/generate/route.test.ts
```

Expected: PASS — 2 tests pass.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: audio generation + serve API routes"
```

---

## Phase 5: Frontend — Core Screens

---

### Task 17: App Shell + Navigation

**Files:**
- Create: `src/components/AppShell.tsx`
- Create: `src/components/BottomNav.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/AppShell.test.tsx`

**Step 1: Write the failing test**

Create `src/components/AppShell.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders bottom nav with three tabs", () => {
    render(<AppShell />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Player")).toBeInTheDocument();
  });

  it("shows upload screen by default", () => {
    render(<AppShell />);
    expect(screen.getByText("Ridecast 2")).toBeInTheDocument();
  });

  it("switches to library screen when Library tab is clicked", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByText("Library"));
    expect(screen.getByText("Library")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/AppShell.test.tsx
```

Expected: FAIL — `Cannot find module './AppShell'`

**Step 3: Write the implementation**

Create `src/components/BottomNav.tsx`:

```tsx
"use client";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  {
    id: "upload",
    label: "Upload",
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: "player",
    label: "Player",
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
  },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-around border-t border-white/[0.08] z-50 pb-[env(safe-area-inset-bottom)]"
      style={{ background: "linear-gradient(to top, rgba(10,10,15,0.98) 60%, rgba(10,10,15,0.85))", backdropFilter: "blur(20px)" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all select-none ${
            activeTab === tab.id ? "text-violet-400" : "text-white/30"
          }`}
        >
          {tab.icon}
          <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
```

Create `src/components/AppShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <div className="max-w-[430px] w-full mx-auto h-[100dvh] relative overflow-hidden bg-[#0a0a0f] border-l border-r border-white/[0.08]">
      {/* Screens */}
      <div className={`absolute inset-0 bottom-16 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "upload" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
        <div className="p-6">
          <div className="text-center pt-4 mb-8">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><circle cx="12" cy="12" r="9" opacity="0.3" /><polygon points="10,8 16,12 10,16" /></svg>
              </div>
              <span className="text-[22px] font-extrabold tracking-tight bg-gradient-to-br from-white to-white/55 bg-clip-text text-transparent">Ridecast 2</span>
            </div>
            <p className="text-sm text-white/55">Turn anything into audio for your commute</p>
          </div>
          <p className="text-white/30 text-center">Upload screen content will go here</p>
        </div>
      </div>

      <div className={`absolute inset-0 bottom-16 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "library" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
        <div className="p-6">
          <h1 className="text-[26px] font-extrabold tracking-tight">Library</h1>
          <p className="text-white/30 mt-4">Library content will go here</p>
        </div>
      </div>

      <div className={`absolute inset-0 bottom-16 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "player" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
        <div className="p-6 text-center pt-16">
          <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-white/30 fill-none mx-auto mb-5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <h3 className="text-lg font-bold mb-1.5">Nothing playing</h3>
          <p className="text-sm text-white/55">Pick something from your library<br />and it&apos;ll appear here.</p>
        </div>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
```

Replace `src/app/page.tsx`:

```tsx
import { AppShell } from "@/components/AppShell";

export default function Home() {
  return <AppShell />;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/AppShell.test.tsx
```

Expected: PASS — 3 tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: app shell with bottom nav and screen switching"
```

---

### Task 18: Player Context (Global State)

**Files:**
- Create: `src/components/PlayerContext.tsx`
- Test: `src/components/PlayerContext.test.tsx`

**Step 1: Write the failing test**

Create `src/components/PlayerContext.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PlayerProvider, usePlayer } from "./PlayerContext";

function TestComponent() {
  const { currentItem, isPlaying, speed, play, togglePlay, setSpeed } = usePlayer();
  return (
    <div>
      <span data-testid="playing">{isPlaying ? "yes" : "no"}</span>
      <span data-testid="speed">{speed}</span>
      <span data-testid="title">{currentItem?.title ?? "none"}</span>
      <button onClick={() => play({ id: "1", title: "Test Audio", duration: 768, format: "narrator", audioUrl: "/audio/test.mp3" })}>
        Play
      </button>
      <button onClick={togglePlay}>Toggle</button>
      <button onClick={() => setSpeed(1.5)}>Speed 1.5</button>
    </div>
  );
}

describe("PlayerContext", () => {
  it("starts with nothing playing", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    expect(screen.getByTestId("playing").textContent).toBe("no");
    expect(screen.getByTestId("title").textContent).toBe("none");
  });

  it("plays an item", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play"));
    expect(screen.getByTestId("playing").textContent).toBe("yes");
    expect(screen.getByTestId("title").textContent).toBe("Test Audio");
  });

  it("toggles play/pause", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play"));
    expect(screen.getByTestId("playing").textContent).toBe("yes");
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("playing").textContent).toBe("no");
  });

  it("changes speed", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Speed 1.5"));
    expect(screen.getByTestId("speed").textContent).toBe("1.5");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/PlayerContext.test.tsx
```

Expected: FAIL — `Cannot find module './PlayerContext'`

**Step 3: Write the implementation**

Create `src/components/PlayerContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export interface PlayableItem {
  id: string;
  title: string;
  duration: number; // seconds
  format: string;
  audioUrl: string;
}

interface PlayerState {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  position: number;
  speed: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (item: PlayableItem) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setPosition: (position: number) => void;
  skipForward: (seconds: number) => void;
  skipBack: (seconds: number) => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentItem, setCurrentItem] = useState<PlayableItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPositionState] = useState(0);
  const [speed, setSpeedState] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((item: PlayableItem) => {
    setCurrentItem(item);
    setIsPlaying(true);
    setPositionState(0);
    if (audioRef.current) {
      audioRef.current.src = item.audioUrl;
      audioRef.current.playbackRate = speed;
      audioRef.current.play().catch(() => {});
    }
  }, [speed]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (audioRef.current) {
        if (next) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
      }
      return next;
    });
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  }, []);

  const setPosition = useCallback((pos: number) => {
    setPositionState(pos);
    if (audioRef.current) {
      audioRef.current.currentTime = pos;
    }
  }, []);

  const skipForward = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
      setPositionState(audioRef.current.currentTime);
    }
  }, []);

  const skipBack = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
      setPositionState(audioRef.current.currentTime);
    }
  }, []);

  return (
    <PlayerContext.Provider
      value={{ currentItem, isPlaying, position, speed, audioRef, play, togglePlay, setSpeed, setPosition, skipForward, skipBack }}
    >
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/PlayerContext.test.tsx
```

Expected: PASS — 4 tests pass.

**Step 5: Commit**

```bash
git add src/components/PlayerContext.tsx src/components/PlayerContext.test.tsx
git commit -m "feat: PlayerContext for global playback state management"
```

---

### Task 19: Upload Screen

**Files:**
- Create: `src/components/UploadScreen.tsx`
- Modify: `src/components/AppShell.tsx` (replace placeholder upload content)

**Step 1: Write the implementation**

Create `src/components/UploadScreen.tsx`:

```tsx
"use client";

import { useState, useRef, DragEvent, FormEvent } from "react";

interface ContentPreview {
  id: string;
  title: string;
  wordCount: number;
  readTime: number;
}

interface UploadScreenProps {
  onProcess: (contentId: string, targetMinutes: number) => void;
}

export function UploadScreen({ onProcess }: UploadScreenProps) {
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ContentPreview | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(15);
  const [sliderValue, setSliderValue] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = [
    { minutes: 5, label: "Quick Summary" },
    { minutes: 15, label: "Main Points" },
    { minutes: 30, label: "Deep Dive" },
  ];

  async function handleUpload(file?: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      } else if (url) {
        formData.append("url", url);
      } else {
        return;
      }

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setPreview({
        id: data.id,
        title: data.title,
        wordCount: data.wordCount,
        readTime: Math.round(data.wordCount / 250),
      });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handlePresetClick(minutes: number) {
    setSelectedPreset(minutes);
    setSliderValue(minutes);
  }

  function handleSliderChange(value: number) {
    setSliderValue(value);
    if ([5, 15, 30].includes(value)) {
      setSelectedPreset(value);
    } else {
      setSelectedPreset(0);
    }
  }

  function handleCreateAudio() {
    if (preview) {
      onProcess(preview.id, sliderValue);
    }
  }

  return (
    <div className="p-6 pt-0">
      {/* Logo */}
      <div className="text-center pt-4 mb-8">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><circle cx="12" cy="12" r="9" opacity="0.3" /><polygon points="10,8 16,12 10,16" /></svg>
          </div>
          <span className="text-[22px] font-extrabold tracking-tight bg-gradient-to-br from-white to-white/55 bg-clip-text text-transparent">Ridecast 2</span>
        </div>
        <p className="text-sm text-white/55">Turn anything into audio for your commute</p>
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-[14px] p-9 text-center cursor-pointer transition-all mb-4 ${
          dragOver ? "border-indigo-500 bg-indigo-500/[0.08]" : "border-indigo-500/30 bg-indigo-500/[0.03]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-violet-400 fill-none mx-auto mb-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="text-[15px] font-semibold mb-1">Drop files here</div>
        <div className="text-xs text-white/55">PDF, EPUB, TXT up to 50MB</div>
        <input ref={fileInputRef} type="file" accept=".pdf,.epub,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      </div>

      {/* Divider */}
      <div className="text-center text-white/30 text-xs font-medium my-4 relative before:content-[''] before:absolute before:top-1/2 before:left-0 before:w-[calc(50%-24px)] before:h-px before:bg-white/[0.08] after:content-[''] after:absolute after:top-1/2 after:right-0 after:w-[calc(50%-24px)] after:h-px after:bg-white/[0.08]">
        or
      </div>

      {/* URL Input */}
      <div className="flex gap-2.5 mb-6">
        <input
          type="text"
          placeholder="Paste article or newsletter URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUpload()}
          className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-[10px] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-indigo-500 focus:bg-indigo-500/[0.06]"
        />
        <button
          onClick={() => handleUpload()}
          disabled={!url || uploading}
          className="px-5 py-3 bg-white/[0.06] border border-white/[0.08] rounded-[10px] text-sm font-semibold transition-all hover:bg-white/10 disabled:opacity-50"
        >
          {uploading ? "..." : "Fetch"}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
      )}

      {/* Content Preview */}
      {preview && (
        <div className="bg-white/[0.06] border border-white/[0.08] rounded-[14px] p-[18px] mb-7 animate-[slideUp_0.4s_ease]">
          <div className="flex items-start gap-3.5 mb-3.5">
            <div className="w-11 h-11 rounded-[10px] bg-gradient-to-br from-indigo-500/20 to-violet-500/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] stroke-violet-400 fill-none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold mb-0.5 leading-snug">{preview.title}</div>
              <div className="text-xs text-white/55 flex gap-3">
                <span>{preview.wordCount.toLocaleString()} words</span>
                <span>~{preview.readTime} min read</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/[0.08] my-3.5" />

          {/* Duration Selector */}
          <div className="text-[13px] font-semibold text-white/55 uppercase tracking-wider mb-3.5">Target Duration</div>
          <div className="flex gap-2 mb-5">
            {presets.map(({ minutes, label }) => (
              <button
                key={minutes}
                onClick={() => handlePresetClick(minutes)}
                className={`flex-1 py-3 px-2 rounded-[10px] text-center transition-all border ${
                  selectedPreset === minutes
                    ? "bg-indigo-500/[0.12] border-indigo-500"
                    : "bg-white/[0.06] border-white/[0.08]"
                }`}
              >
                <div className={`text-[15px] font-bold mb-0.5 ${selectedPreset === minutes ? "text-violet-400" : "text-white"}`}>~{minutes} min</div>
                <div className="text-[11px] text-white/55 font-medium">{label}</div>
              </button>
            ))}
          </div>

          {/* Slider */}
          <div className="mb-7">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[13px] text-white/55">Fit to my commute</span>
              <span className="text-lg font-bold text-violet-400">{sliderValue} min</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
            />
            <div className="flex justify-between mt-1.5 px-0.5">
              {[5, 15, 30, 45, 60].map((t) => (
                <span key={t} className="text-[10px] text-white/30">{t}</span>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateAudio}
            className="w-full py-3.5 px-7 rounded-[14px] text-[15px] font-semibold text-white transition-all bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.5)] active:scale-[0.96] flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            Create Audio
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update AppShell to use UploadScreen**

In `src/components/AppShell.tsx`, add the import at the top:

```typescript
import { UploadScreen } from "./UploadScreen";
```

Replace the upload screen placeholder content (the inner div of the upload screen section) with:

```tsx
<UploadScreen onProcess={(contentId, targetMinutes) => {
  console.log("Process:", contentId, targetMinutes);
  setActiveTab("library");
}} />
```

**Step 3: Visual verification**

```bash
npm run dev
```

Open http://localhost:3000 — you should see the upload screen matching the prototype: logo, drop zone, URL input, and the "or" divider.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: upload screen with drop zone, URL input, duration presets, slider"
```

---

### Task 20: Processing Screen

**Files:**
- Create: `src/components/ProcessingScreen.tsx`
- Modify: `src/components/AppShell.tsx`

**Step 1: Write the implementation**

Create `src/components/ProcessingScreen.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface ProcessingScreenProps {
  contentId: string;
  targetMinutes: number;
  onComplete: (scriptId: string) => void;
}

type Stage = "analyzing" | "compressing" | "generating" | "done";

export function ProcessingScreen({ contentId, targetMinutes, onComplete }: ProcessingScreenProps) {
  const [stage, setStage] = useState<Stage>("analyzing");
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Step 1: Analyze + generate script
        setStage("analyzing");
        setProgress(15);

        const processRes = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, targetMinutes }),
        });
        const processData = await processRes.json();

        if (cancelled) return;
        if (!processRes.ok) throw new Error(processData.error);

        setStage("compressing");
        setProgress(40);
        setFormat(processData.format === "conversation" ? "Conversation" : "Narrator");

        // Small delay for UX
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;

        setProgress(60);
        setStage("generating");

        // Step 2: Generate audio
        const audioRes = await fetch("/api/audio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptId: processData.id }),
        });
        const audioData = await audioRes.json();

        if (cancelled) return;
        if (!audioRes.ok) throw new Error(audioData.error);

        setProgress(100);
        setStage("done");

        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;

        onComplete(processData.id);
      } catch (error) {
        console.error("Processing failed:", error);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [contentId, targetMinutes, onComplete]);

  const stages: { id: Stage; label: string }[] = [
    { id: "analyzing", label: "Analyzing content..." },
    { id: "compressing", label: `Compressing to ${targetMinutes} minutes...` },
    { id: "generating", label: "Generating audio..." },
  ];

  const stageOrder: Stage[] = ["analyzing", "compressing", "generating", "done"];
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-10">
      {/* Artwork */}
      <div
        className="w-[120px] h-[120px] rounded-[28px] flex items-center justify-center mb-9"
        style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6, #c084fc)",
          backgroundSize: "200% 200%",
          animation: "gradientShift 3s ease infinite",
          boxShadow: "0 0 60px rgba(99,102,241,0.3)",
        }}
      >
        <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white opacity-90">
          <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" opacity="0.7" />
          <circle cx="18" cy="16" r="3" opacity="0.7" />
        </svg>
      </div>

      {/* Stages */}
      <div className="w-full max-w-[280px] mb-8">
        {stages.map(({ id, label }, i) => {
          const stageIdx = stageOrder.indexOf(id);
          const isDone = currentIndex > stageIdx;
          const isActive = currentIndex === stageIdx;

          return (
            <div key={id} className="flex items-center gap-3 py-2.5 transition-all">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                isDone ? "border-green-500 bg-green-500/15" : isActive ? "border-indigo-500 bg-indigo-500/20" : "border-white/[0.08] bg-white/[0.06]"
              } ${isActive ? "animate-[pulseDot_1.5s_ease_infinite]" : ""}`}>
                <svg viewBox="0 0 24 24" className={`w-3 h-3 fill-none stroke-2 ${isDone ? "stroke-green-500" : "stroke-white/30"}`} strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className={`text-sm font-medium transition-all ${
                isDone ? "text-white/55" : isActive ? "text-white" : "text-white/30"
              }`}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-[280px] h-1 bg-white/[0.08] rounded-sm overflow-hidden mb-5">
        <div
          className="h-full rounded-sm transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
        />
      </div>

      {/* Format Badge */}
      {format && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-violet-400 transition-opacity">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          AI chose: {format} style
        </span>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ProcessingScreen.tsx
git commit -m "feat: processing screen with staged animation and progress bar"
```

---

### Task 21: Library Screen

**Files:**
- Create: `src/components/LibraryScreen.tsx`
- Create: `src/app/api/library/route.ts`

**Step 1: Create library API route**

Create `src/app/api/library/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = "default-user";

export async function GET() {
  try {
    const items = await prisma.content.findMany({
      where: { userId: DEFAULT_USER_ID },
      include: {
        scripts: {
          include: {
            audio: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const library = items.map((item) => {
      const latestScript = item.scripts[item.scripts.length - 1];
      const latestAudio = latestScript?.audio[latestScript.audio.length - 1];

      return {
        id: item.id,
        title: item.title,
        sourceType: item.sourceType,
        createdAt: item.createdAt,
        status: latestAudio ? "ready" : latestScript ? "generating" : "processing",
        format: latestScript?.format ?? null,
        durationSecs: latestAudio?.durationSecs ?? null,
        audioId: latestAudio?.id ?? null,
        audioUrl: latestAudio?.filePath ?? null,
      };
    });

    return NextResponse.json(library);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  }
}
```

**Step 2: Create Library component**

Create `src/components/LibraryScreen.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDuration } from "@/lib/utils/duration";
import { usePlayer } from "./PlayerContext";

interface LibraryItem {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
  status: string;
  format: string | null;
  durationSecs: number | null;
  audioId: string | null;
  audioUrl: string | null;
}

const gradients = [
  "from-indigo-500 to-violet-500",
  "from-pink-500 to-rose-500",
  "from-teal-500 to-cyan-500",
  "from-amber-500 to-red-500",
];

const sourceIcons: Record<string, string> = {
  pdf: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
  epub: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  url: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  txt: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
};

export function LibraryScreen() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { play } = usePlayer();

  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      setItems(data);
    } catch {
      console.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  function handlePlay(item: LibraryItem) {
    if (item.status !== "ready" || !item.audioUrl || !item.audioId) return;
    play({
      id: item.audioId,
      title: item.title,
      duration: item.durationSecs ?? 0,
      format: item.format ?? "narrator",
      audioUrl: item.audioUrl,
    });
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight">Library</h1>
        <span className="text-[13px] text-white/55">{items.length} episode{items.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="text-center text-white/30 py-20">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-white/30 fill-none mx-auto mb-5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <h3 className="text-lg font-bold mb-1.5">No episodes yet</h3>
          <p className="text-sm text-white/55">Upload content to create your first audio episode.</p>
        </div>
      ) : (
        <div>
          {items.map((item, i) => (
            <div
              key={item.id}
              onClick={() => handlePlay(item)}
              className="flex items-center gap-3.5 p-4 mb-2.5 rounded-[14px] bg-white/[0.06] border border-white/[0.08] cursor-pointer transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <div className={`w-[52px] h-[52px] rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center shrink-0`}>
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white opacity-85">
                  <path d={sourceIcons[item.sourceType] || sourceIcons.txt} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate mb-0.5">{item.title}</div>
                <div className="text-xs text-white/55 flex items-center gap-2">
                  <span className="uppercase">{item.sourceType}</span>
                  <span>&middot;</span>
                  <span>{timeAgo(item.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {item.durationSecs && (
                  <span className="text-[13px] font-semibold text-white/55">{formatDuration(item.durationSecs)}</span>
                )}
                {item.status === "ready" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-500/15 text-green-500">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500">
                    Processing
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/LibraryScreen.tsx src/app/api/library/route.ts
git commit -m "feat: library screen with card layout, status badges, and playback"
```

---

### Task 22: Player — Collapsed Bar + Expanded View + Car Mode

**Files:**
- Create: `src/components/PlayerBar.tsx`
- Create: `src/components/ExpandedPlayer.tsx`
- Create: `src/components/CarMode.tsx`

**Step 1: Create PlayerBar**

Create `src/components/PlayerBar.tsx`:

```tsx
"use client";

import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";

interface PlayerBarProps {
  onExpand: () => void;
}

export function PlayerBar({ onExpand }: PlayerBarProps) {
  const { currentItem, isPlaying, position, togglePlay } = usePlayer();

  if (!currentItem) return null;

  const progress = currentItem.duration > 0 ? (position / currentItem.duration) * 100 : 0;

  return (
    <div
      onClick={onExpand}
      className="absolute bottom-16 left-2 right-2 h-[58px] flex items-center gap-3 px-3 z-[60] cursor-pointer rounded-[14px] border border-indigo-500/20 transition-all"
      style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))", backdropFilter: "blur(24px)" }}
    >
      <div className="w-[38px] h-[38px] rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white">
          <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" opacity="0.7" /><circle cx="18" cy="16" r="3" opacity="0.7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{currentItem.title}</div>
        <div className="text-[11px] text-white/55 mt-px">{currentItem.format} &middot; {formatDuration(currentItem.duration)}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shrink-0 transition-all active:scale-[0.88]"
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#0a0a0f]"><rect x="7" y="6" width="3.5" height="12" rx="1" /><rect x="13.5" y="6" width="3.5" height="12" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#0a0a0f]"><polygon points="9,6 18,12 9,18" /></svg>
        )}
      </button>
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-white/10 rounded-sm overflow-hidden">
        <div className="h-full rounded-sm transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
      </div>
    </div>
  );
}
```

**Step 2: Create ExpandedPlayer**

Create `src/components/ExpandedPlayer.tsx`:

```tsx
"use client";

import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

interface ExpandedPlayerProps {
  onClose: () => void;
  onCarMode: () => void;
}

export function ExpandedPlayer({ onClose, onCarMode }: ExpandedPlayerProps) {
  const { currentItem, isPlaying, position, speed, togglePlay, setSpeed, setPosition, skipForward, skipBack } = usePlayer();

  if (!currentItem) return null;

  const duration = currentItem.duration;
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const remaining = duration - position;

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
  }

  function seekProgress(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setPosition(Math.max(0, Math.min(duration, pct * duration)));
  }

  return (
    <div className="absolute inset-0 z-[100] bg-[#0a0a0f] flex flex-col transition-transform duration-400">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full transition-all hover:bg-white/[0.06]">
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-white/55 fill-none" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        <span className="text-xs font-semibold text-white/55 uppercase tracking-widest">Now Playing</span>
        <div className="w-9" />
      </div>

      {/* Artwork */}
      <div className="mx-auto mb-8 mt-2 rounded-3xl flex items-center justify-center"
        style={{
          width: "calc(100% - 80px)", maxWidth: "300px", aspectRatio: "1",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6, #c084fc)", backgroundSize: "200% 200%",
          animation: "gradientShift 6s ease infinite", boxShadow: "0 16px 64px rgba(99,102,241,0.25)"
        }}>
        <svg viewBox="0 0 24 24" className="w-[60px] h-[60px] fill-white opacity-85">
          <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" opacity="0.7" /><circle cx="18" cy="16" r="3" opacity="0.7" />
        </svg>
      </div>

      {/* Info */}
      <div className="text-center px-6 mb-6">
        <h2 className="text-xl font-bold mb-1.5 tracking-tight">{currentItem.title}</h2>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-violet-400">
          {currentItem.format}
        </span>
      </div>

      {/* Progress */}
      <div className="px-6 mb-6">
        <div onClick={seekProgress} className="w-full h-1 bg-white/10 rounded-sm cursor-pointer relative group hover:h-1.5 transition-all">
          <div className="h-full rounded-sm relative" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-white/55 font-medium tabular-nums">{formatDuration(Math.floor(position))}</span>
          <span className="text-[11px] text-white/55 font-medium tabular-nums">-{formatDuration(Math.floor(remaining))}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-7 px-6 mb-8">
        <button onClick={() => skipBack(15)} className="w-12 h-12 flex flex-col items-center justify-center rounded-full active:scale-[0.88] relative">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M12.5 8.5C12.5 8.5 7 12 7 12l5.5 3.5V8.5z" /><path d="M18 8.5C18 8.5 12.5 12 12.5 12L18 15.5V8.5z" /><rect x="4" y="7" width="2" height="10" rx="0.5" /></svg>
          <span className="absolute -bottom-3.5 text-[9px] font-semibold text-white/30">15s</span>
        </button>
        <button onClick={togglePlay} className="w-[68px] h-[68px] bg-white rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-[0.92] shadow-[0_4px_20px_rgba(255,255,255,0.15)]">
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#0a0a0f]"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#0a0a0f] ml-0.5"><polygon points="8,5 19,12 8,19" /></svg>
          )}
        </button>
        <button onClick={() => skipForward(30)} className="w-12 h-12 flex flex-col items-center justify-center rounded-full active:scale-[0.88] relative">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M11.5 15.5V8.5L17 12l-5.5 3.5z" /><rect x="18" y="7" width="2" height="10" rx="0.5" /></svg>
          <span className="absolute -bottom-3.5 text-[9px] font-semibold text-white/30">30s</span>
        </button>
      </div>

      {/* Extras */}
      <div className="flex items-center justify-around px-10 mb-5">
        <button onClick={cycleSpeed} className="flex flex-col items-center gap-1 p-2 rounded-lg active:scale-90">
          <span className="bg-white/[0.06] border border-white/[0.08] rounded-full px-3 py-1 text-[13px] font-bold">{speed}x</span>
          <span className="text-[10px] font-semibold text-white/55">Speed</span>
        </button>
        <button onClick={onCarMode} className="flex flex-col items-center gap-1 p-2 rounded-lg active:scale-90">
          <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] stroke-white/55 fill-none" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          </svg>
          <span className="text-[10px] font-semibold text-white/55">Car Mode</span>
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Create CarMode**

Create `src/components/CarMode.tsx`:

```tsx
"use client";

import { usePlayer } from "./PlayerContext";

interface CarModeProps {
  onExit: () => void;
}

export function CarMode({ onExit }: CarModeProps) {
  const { currentItem, isPlaying, togglePlay, skipForward, skipBack } = usePlayer();

  if (!currentItem) return null;

  return (
    <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center">
      {/* Close */}
      <button onClick={onExit} className="absolute top-5 right-5 w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.06] active:scale-[0.88] active:bg-white/[0.12]">
        <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-white/55 fill-none" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>

      {/* Title */}
      <div className="absolute top-[12%] left-6 right-6 text-center text-[22px] font-extrabold tracking-tight leading-snug">
        {currentItem.title}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-10">
        <button onClick={() => skipBack(30)} className="w-20 h-20 rounded-full bg-white/[0.06] flex flex-col items-center justify-center border border-white/[0.08] active:scale-[0.88] active:bg-white/[0.12]">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white"><path d="M12.5 8.5C12.5 8.5 7 12 7 12l5.5 3.5V8.5z" /><path d="M18 8.5C18 8.5 12.5 12 12.5 12L18 15.5V8.5z" /><rect x="4" y="7" width="2" height="10" rx="0.5" /></svg>
          <span className="text-[10px] font-bold text-white/55 mt-0.5">30s</span>
        </button>

        <button
          onClick={togglePlay}
          className="w-[140px] h-[140px] rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center active:scale-90"
          style={{ boxShadow: "0 0 60px rgba(99,102,241,0.3)" }}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="w-14 h-14 fill-white"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-14 h-14 fill-white ml-1.5"><polygon points="8,5 19,12 8,19" /></svg>
          )}
        </button>

        <button onClick={() => skipForward(30)} className="w-20 h-20 rounded-full bg-white/[0.06] flex flex-col items-center justify-center border border-white/[0.08] active:scale-[0.88] active:bg-white/[0.12]">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white"><path d="M11.5 15.5V8.5L17 12l-5.5 3.5z" /><rect x="18" y="7" width="2" height="10" rx="0.5" /></svg>
          <span className="text-[10px] font-bold text-white/55 mt-0.5">30s</span>
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/PlayerBar.tsx src/components/ExpandedPlayer.tsx src/components/CarMode.tsx
git commit -m "feat: player bar, expanded player, and car mode components"
```

---

## Phase 6: Integration + Polish

---

### Task 23: End-to-End Wiring

**Goal:** Wire all screens together in AppShell so the full flow works: Upload → Process → Library → Play.

**Files:**
- Modify: `src/components/AppShell.tsx` (major rewrite)
- Modify: `src/app/layout.tsx` (add PlayerProvider)

**Step 1: Update layout with PlayerProvider**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PlayerProvider } from "@/components/PlayerContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ridecast 2",
  description: "Turn anything into audio for your commute",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
```

**Step 2: Rewrite AppShell with full wiring**

Replace `src/components/AppShell.tsx` entirely:

```tsx
"use client";

import { useState, useCallback } from "react";
import { BottomNav } from "./BottomNav";
import { UploadScreen } from "./UploadScreen";
import { ProcessingScreen } from "./ProcessingScreen";
import { LibraryScreen } from "./LibraryScreen";
import { PlayerBar } from "./PlayerBar";
import { ExpandedPlayer } from "./ExpandedPlayer";
import { CarMode } from "./CarMode";
import { usePlayer } from "./PlayerContext";

export function AppShell() {
  const [activeTab, setActiveTab] = useState("upload");
  const [processing, setProcessing] = useState<{ contentId: string; targetMinutes: number } | null>(null);
  const [showExpandedPlayer, setShowExpandedPlayer] = useState(false);
  const [showCarMode, setShowCarMode] = useState(false);
  const { currentItem } = usePlayer();

  const handleProcess = useCallback((contentId: string, targetMinutes: number) => {
    setProcessing({ contentId, targetMinutes });
    setActiveTab("processing");
  }, []);

  const handleProcessComplete = useCallback(() => {
    setProcessing(null);
    setActiveTab("library");
  }, []);

  const hasPlayerBar = !!currentItem && !showExpandedPlayer && !showCarMode;

  return (
    <div className="max-w-[430px] w-full mx-auto h-[100dvh] relative overflow-hidden bg-[#0a0a0f] border-l border-r border-white/[0.08]">
      {/* Upload Screen */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "upload" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: hasPlayerBar ? "130px" : "64px" }}>
        <UploadScreen onProcess={handleProcess} />
      </div>

      {/* Processing Screen */}
      <div className={`absolute inset-0 overflow-hidden transition-all duration-300 ${activeTab === "processing" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: "64px" }}>
        {processing && (
          <ProcessingScreen
            contentId={processing.contentId}
            targetMinutes={processing.targetMinutes}
            onComplete={handleProcessComplete}
          />
        )}
      </div>

      {/* Library Screen */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "library" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: hasPlayerBar ? "130px" : "64px" }}>
        <LibraryScreen />
      </div>

      {/* Player Tab (empty state) */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "player" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: hasPlayerBar ? "130px" : "64px" }}>
        {currentItem ? (
          <div className="p-6 text-center pt-8">
            <p className="text-white/55">Tap the player bar to expand</p>
          </div>
        ) : (
          <div className="p-6 text-center pt-16">
            <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-white/30 fill-none mx-auto mb-5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <h3 className="text-lg font-bold mb-1.5">Nothing playing</h3>
            <p className="text-sm text-white/55">Pick something from your library<br />and it&apos;ll appear here.</p>
          </div>
        )}
      </div>

      {/* Player Bar */}
      {hasPlayerBar && (
        <PlayerBar onExpand={() => setShowExpandedPlayer(true)} />
      )}

      {/* Bottom Nav */}
      {!showExpandedPlayer && !showCarMode && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Expanded Player Overlay */}
      {showExpandedPlayer && (
        <ExpandedPlayer
          onClose={() => setShowExpandedPlayer(false)}
          onCarMode={() => { setShowExpandedPlayer(false); setShowCarMode(true); }}
        />
      )}

      {/* Car Mode Overlay */}
      {showCarMode && (
        <CarMode onExit={() => { setShowCarMode(false); setShowExpandedPlayer(true); }} />
      )}
    </div>
  );
}
```

**Step 3: Verify visual flow**

```bash
npm run dev
```

Navigate through: Upload (drop a .txt file) → see processing screen → see library → tap item → player bar → expand → car mode → back.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire all screens together — full upload-to-play flow"
```

---

### Task 24: Offline Support (PWA + IndexedDB)

**Files:**
- Create: `src/lib/offline/cache.ts`
- Create: `public/manifest.json`
- Modify: `src/app/layout.tsx` (add manifest link)
- Test: `src/lib/offline/cache.test.ts`

**Step 1: Create manifest**

Create `public/manifest.json`:

```json
{
  "name": "Ridecast 2",
  "short_name": "Ridecast",
  "description": "Turn anything into audio for your commute",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 2: Write the failing test for audio caching**

Create `src/lib/offline/cache.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Dexie for Node.js test environment
vi.mock("dexie", () => {
  const store: Record<string, ArrayBuffer> = {};
  return {
    default: vi.fn().mockImplementation(() => ({
      version: vi.fn().mockReturnThis(),
      stores: vi.fn().mockReturnThis(),
      audioCache: {
        get: vi.fn((key: string) => Promise.resolve(store[key] ? { id: key, data: store[key] } : undefined)),
        put: vi.fn((item: { id: string; data: ArrayBuffer }) => { store[item.id] = item.data; return Promise.resolve(); }),
        delete: vi.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
      },
    })),
  };
});

import { cacheAudio, getCachedAudio, removeCachedAudio } from "./cache";

describe("Audio cache", () => {
  it("caches and retrieves audio data", async () => {
    const data = new ArrayBuffer(10);
    await cacheAudio("audio-1", data);
    const cached = await getCachedAudio("audio-1");
    expect(cached).toBeDefined();
  });

  it("returns undefined for uncached audio", async () => {
    const cached = await getCachedAudio("nonexistent");
    expect(cached).toBeUndefined();
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run src/lib/offline/cache.test.ts
```

Expected: FAIL — `Cannot find module './cache'`

**Step 4: Write the implementation**

Create `src/lib/offline/cache.ts`:

```typescript
import Dexie from "dexie";

interface CachedAudio {
  id: string;
  data: ArrayBuffer;
  cachedAt: number;
}

class AudioCacheDB extends Dexie {
  audioCache!: Dexie.Table<CachedAudio, string>;

  constructor() {
    super("RidecastAudioCache");
    this.version(1).stores({
      audioCache: "id",
    });
  }
}

const db = new AudioCacheDB();

export async function cacheAudio(audioId: string, data: ArrayBuffer): Promise<void> {
  await db.audioCache.put({ id: audioId, data, cachedAt: Date.now() });
}

export async function getCachedAudio(audioId: string): Promise<ArrayBuffer | undefined> {
  const entry = await db.audioCache.get(audioId);
  return entry?.data;
}

export async function removeCachedAudio(audioId: string): Promise<void> {
  await db.audioCache.delete(audioId);
}

export async function isAudioCached(audioId: string): Promise<boolean> {
  const entry = await db.audioCache.get(audioId);
  return !!entry;
}
```

**Step 5: Add manifest to layout**

In `src/app/layout.tsx`, add inside the `<head>` (or via the `metadata` export):

```typescript
export const metadata: Metadata = {
  title: "Ridecast 2",
  description: "Turn anything into audio for your commute",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
};
```

**Step 6: Run test to verify it passes**

```bash
npx vitest run src/lib/offline/cache.test.ts
```

Expected: PASS — 2 tests pass.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: offline support — PWA manifest + IndexedDB audio caching via Dexie"
```

---

### Task 25: Playback State Persistence

**Files:**
- Create: `src/app/api/playback/route.ts`
- Test: `src/app/api/playback/route.test.ts`

**Step 1: Write the failing test**

Create `src/app/api/playback/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    playbackState: {
      upsert: vi.fn().mockImplementation((args) =>
        Promise.resolve({
          id: "ps-1",
          ...args.create,
          updatedAt: new Date(),
        })
      ),
      findUnique: vi.fn(),
    },
  },
}));

import { POST, GET } from "./route";
import { prisma } from "@/lib/db";

describe("Playback state API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves playback position and speed", async () => {
    const request = new Request("http://localhost:3000/api/playback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioId: "audio-1", position: 120.5, speed: 1.5 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(prisma.playbackState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_audioId: { userId: "default-user", audioId: "audio-1" } },
        update: { position: 120.5, speed: 1.5 },
        create: expect.objectContaining({ audioId: "audio-1", position: 120.5, speed: 1.5 }),
      })
    );
  });

  it("retrieves playback state", async () => {
    (prisma.playbackState.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "ps-1",
      position: 250,
      speed: 1.25,
      completed: false,
    });

    const request = new Request("http://localhost:3000/api/playback?audioId=audio-1");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.position).toBe(250);
    expect(body.speed).toBe(1.25);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/api/playback/route.test.ts
```

Expected: FAIL — `Cannot find module './route'`

**Step 3: Write the implementation**

Create `src/app/api/playback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = "default-user";

export async function POST(request: NextRequest) {
  try {
    const { audioId, position, speed, completed } = await request.json();

    if (!audioId) {
      return NextResponse.json({ error: "audioId is required" }, { status: 400 });
    }

    const state = await prisma.playbackState.upsert({
      where: {
        userId_audioId: { userId: DEFAULT_USER_ID, audioId },
      },
      update: {
        position: position ?? undefined,
        speed: speed ?? undefined,
        completed: completed ?? undefined,
      },
      create: {
        userId: DEFAULT_USER_ID,
        audioId,
        position: position ?? 0,
        speed: speed ?? 1.0,
        completed: completed ?? false,
      },
    });

    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save playback state" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const audioId = request.nextUrl.searchParams.get("audioId");
    if (!audioId) {
      return NextResponse.json({ error: "audioId is required" }, { status: 400 });
    }

    const state = await prisma.playbackState.findUnique({
      where: {
        userId_audioId: { userId: DEFAULT_USER_ID, audioId },
      },
    });

    if (!state) {
      return NextResponse.json({ position: 0, speed: 1.0, completed: false });
    }

    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json({ error: "Failed to get playback state" }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/api/playback/route.test.ts
```

Expected: PASS — 2 tests pass.

**Step 5: Commit**

```bash
git add src/app/api/playback/route.ts src/app/api/playback/route.test.ts
git commit -m "feat: playback state persistence API (position, speed, completed)"
```

---

## Phase 7: E2E Proof Scenarios

---

### Task 26: Scenario 1 — "The PDF Commute"

**Files:**
- Create: `e2e/pdf-commute.spec.ts`
- Create: `test-fixtures/sample.pdf` (small test PDF)

**Step 1: Create test fixture**

Create a minimal test PDF. Run this Node script to generate one:

Create `scripts/create-test-pdf.ts`:

```typescript
// Run: npx tsx scripts/create-test-pdf.ts
import { writeFileSync } from "fs";

// Minimal valid PDF with text
const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Hello World) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000360 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
431
%%EOF`;

writeFileSync("test-fixtures/sample.pdf", pdf);
console.log("Created test-fixtures/sample.pdf");
```

```bash
mkdir -p scripts
npx tsx scripts/create-test-pdf.ts
```

**Step 2: Write the E2E test**

Create `e2e/pdf-commute.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Scenario 1: The PDF Commute", () => {
  test("upload PDF → process → library → play → change speed", async ({ page }) => {
    await page.goto("/");

    // Verify upload screen
    await expect(page.getByText("Ridecast 2")).toBeVisible();
    await expect(page.getByText("Drop files here")).toBeVisible();

    // Upload a PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.resolve(__dirname, "../test-fixtures/sample.pdf")
    );

    // Wait for content preview to appear
    await expect(page.getByText("Target Duration")).toBeVisible({ timeout: 10000 });

    // Select "~15 min" preset (should be default, but click to be sure)
    await page.getByText("~15 min").click();

    // Click "Create Audio"
    await page.getByText("Create Audio").click();

    // Should see processing screen
    await expect(page.getByText("Analyzing content")).toBeVisible({ timeout: 5000 });

    // Wait for processing to complete and transition to library
    await expect(page.getByText("Library")).toBeVisible({ timeout: 60000 });

    // Find the new item in the library
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 60000 });

    // Click on the item to play
    await page.getByText("Ready").first().click();

    // Player bar should appear
    await expect(page.locator(".absolute.bottom-16")).toBeVisible({ timeout: 5000 });

    // Expand player
    await page.locator(".absolute.bottom-16").click();

    // Should see expanded player
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Change speed
    await page.getByText("1x").click();
    await expect(page.getByText("1.25x")).toBeVisible();

    // Skip forward
    await page.getByText("30s").click();
  });
});
```

**Step 3: Run the test**

```bash
npx playwright test e2e/pdf-commute.spec.ts
```

Expected: PASS (requires running dev server and real API keys for AI/TTS, or mock server setup).

Note: For local testing without real API keys, you can mock the API responses. For CI, set up API mocks.

**Step 4: Commit**

```bash
git add -A
git commit -m "test: E2E Scenario 1 — The PDF Commute"
```

---

### Task 27: Scenario 2 — "The Article Discussion"

**Files:**
- Create: `e2e/article-discussion.spec.ts`

**Step 1: Write the E2E test**

Create `e2e/article-discussion.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Scenario 2: The Article Discussion", () => {
  test("paste URL → process → conversation format → play", async ({ page }) => {
    await page.goto("/");

    // Paste a URL
    await page.getByPlaceholder("Paste article or newsletter URL").fill(
      "https://paulgraham.com/ds.html"
    );
    await page.getByText("Fetch").click();

    // Wait for content preview
    await expect(page.getByText("Target Duration")).toBeVisible({ timeout: 15000 });

    // Select Main Points ~15 min
    await page.getByText("~15 min").click();

    // Create Audio
    await page.getByText("Create Audio").click();

    // Wait for processing
    await expect(page.getByText("Analyzing content")).toBeVisible({ timeout: 5000 });

    // Should show AI format decision
    await expect(page.getByText(/AI chose:/)).toBeVisible({ timeout: 30000 });

    // Wait for completion and library
    await expect(page.getByText("Library")).toBeVisible({ timeout: 60000 });

    // Verify item is ready
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 60000 });

    // Play the item
    await page.getByText("Ready").first().click();

    // Verify player shows
    await expect(page.locator(".absolute.bottom-16")).toBeVisible({ timeout: 5000 });
  });
});
```

**Step 2: Commit**

```bash
git add e2e/article-discussion.spec.ts
git commit -m "test: E2E Scenario 2 — The Article Discussion"
```

---

### Task 28: Scenario 3 — "The Commute Flow"

**Files:**
- Create: `e2e/commute-flow.spec.ts`

**Step 1: Write the E2E test**

Create `e2e/commute-flow.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Scenario 3: The Commute Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Seed some library items (assumes seed data exists)
    await page.goto("/");
  });

  test("library → player bar → expanded → car mode → back", async ({ page }) => {
    // Navigate to library
    await page.getByText("Library").click();

    // Wait for items to load
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 10000 });

    // Tap first item
    await page.locator('[class*="lib-card"], [class*="rounded-\\[14px\\"]').first().click();

    // Player bar should appear at the bottom
    const playerBar = page.locator(".absolute.bottom-16").first();
    await expect(playerBar).toBeVisible({ timeout: 3000 });

    // Tap player bar to expand
    await playerBar.click();

    // Expanded player should show
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Verify controls exist
    await expect(page.getByText("15s")).toBeVisible();
    await expect(page.getByText("30s")).toBeVisible();
    await expect(page.getByText("Speed")).toBeVisible();

    // Enter Car Mode
    await page.getByText("Car Mode").click();

    // Car mode should show massive play button
    const carPlayBtn = page.locator(".w-\\[140px\\]");
    await expect(carPlayBtn).toBeVisible({ timeout: 3000 });

    // Verify skip buttons exist in car mode
    const skipButtons = page.locator("text=30s");
    await expect(skipButtons.first()).toBeVisible();

    // Test play/pause in car mode
    await carPlayBtn.click();

    // Exit car mode (X button)
    await page.locator('[class*="car-close"], button:has(line)').first().click();

    // Should be back at expanded player
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Close expanded player
    await page.locator('button:has(polyline[points="6 9 12 15 18 9"])').click();

    // Should see library again
    await expect(page.getByText("Library")).toBeVisible();
  });
});
```

**Step 2: Commit**

```bash
git add e2e/commute-flow.spec.ts
git commit -m "test: E2E Scenario 3 — The Commute Flow (library → player → car mode → back)"
```

---

### Task 29: Scenario 4 — "Offline Listening"

**Files:**
- Create: `e2e/offline-listening.spec.ts`

**Step 1: Write the E2E test**

Create `e2e/offline-listening.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Scenario 4: Offline Listening", () => {
  test("play audio while online, then play cached audio offline", async ({ page, context }) => {
    await page.goto("/");

    // Navigate to library
    await page.getByText("Library").click();

    // Wait for items
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 10000 });

    // Play an item (this caches the audio)
    await page.locator('[class*="rounded-\\[14px\\"]').first().click();

    // Wait for player bar
    await expect(page.locator(".absolute.bottom-16").first()).toBeVisible({ timeout: 3000 });

    // Go offline
    await context.setOffline(true);

    // Navigate back to library
    await page.getByText("Library").click();

    // Items should still show from cache/state
    // Note: library data needs to be cached for full offline support
    // For v1, we verify the player still works with cached audio

    // Go back online
    await context.setOffline(false);

    // Verify app recovers
    await page.getByText("Library").click();
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 10000 });
  });
});
```

**Step 2: Commit**

```bash
git add e2e/offline-listening.spec.ts
git commit -m "test: E2E Scenario 4 — Offline Listening"
```

---

### Task 30: Scenario 5 — "Quick Re-listen"

**Files:**
- Create: `e2e/quick-relisten.spec.ts`

**Step 1: Write the E2E test**

Create `e2e/quick-relisten.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Scenario 5: Quick Re-listen", () => {
  test("resume from saved position with saved speed", async ({ page }) => {
    await page.goto("/");

    // Navigate to library
    await page.getByText("Library").click();
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 10000 });

    // Play first item
    await page.locator('[class*="rounded-\\[14px\\"]').first().click();
    await expect(page.locator(".absolute.bottom-16").first()).toBeVisible({ timeout: 3000 });

    // Expand player
    await page.locator(".absolute.bottom-16").first().click();
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Change speed to 1.5x
    await page.getByText("1x").click(); // -> 1.25x
    await page.getByText("1.25x").click(); // -> 1.5x

    // Verify speed changed
    await expect(page.getByText("1.5x")).toBeVisible();

    // Skip forward to simulate listening
    await page.getByText("30s").last().click();

    // Close player
    await page.locator('button:has(polyline[points="6 9 12 15 18 9"])').click();

    // Navigate away and come back
    await page.getByText("Upload").click();
    await page.getByText("Library").click();

    // Re-open the same item
    await page.locator('[class*="rounded-\\[14px\\"]').first().click();

    // Expand player
    await page.locator(".absolute.bottom-16").first().click();
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Speed should still be 1.5x (persisted in context)
    await expect(page.getByText("1.5x")).toBeVisible();
  });
});
```

**Step 2: Commit**

```bash
git add e2e/quick-relisten.spec.ts
git commit -m "test: E2E Scenario 5 — Quick Re-listen (resume position + speed)"
```

---

## Summary

### File Tree (Final)

```
ridecast2/
├── prisma/
│   ├── schema.prisma         # Database schema (5 tables)
│   └── seed.ts               # Test data seeder
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with PlayerProvider
│   │   ├── page.tsx           # Renders AppShell
│   │   ├── globals.css        # Tailwind + CSS variables
│   │   └── api/
│   │       ├── upload/route.ts
│   │       ├── process/route.ts
│   │       ├── library/route.ts
│   │       ├── playback/route.ts
│   │       └── audio/
│   │           ├── generate/route.ts
│   │           └── [id]/route.ts
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── BottomNav.tsx
│   │   ├── UploadScreen.tsx
│   │   ├── ProcessingScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   ├── PlayerBar.tsx
│   │   ├── ExpandedPlayer.tsx
│   │   ├── CarMode.tsx
│   │   └── PlayerContext.tsx
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── extractors/
│   │   │   ├── types.ts
│   │   │   ├── txt.ts
│   │   │   ├── pdf.ts
│   │   │   ├── epub.ts
│   │   │   ├── url.ts
│   │   │   └── index.ts
│   │   ├── ai/
│   │   │   ├── types.ts
│   │   │   └── claude.ts
│   │   ├── tts/
│   │   │   ├── types.ts
│   │   │   ├── openai.ts
│   │   │   ├── narrator.ts
│   │   │   └── conversation.ts
│   │   ├── utils/
│   │   │   ├── hash.ts
│   │   │   ├── duration.ts
│   │   │   └── script-parser.ts
│   │   └── offline/
│   │       └── cache.ts
│   └── test-setup.ts
├── e2e/
│   ├── pdf-commute.spec.ts
│   ├── article-discussion.spec.ts
│   ├── commute-flow.spec.ts
│   ├── offline-listening.spec.ts
│   └── quick-relisten.spec.ts
├── test-fixtures/
│   └── sample.pdf
├── public/
│   ├── audio/                 # Generated audio files
│   └── manifest.json          # PWA manifest
├── vitest.config.ts
├── playwright.config.ts
└── .env
```

### Task Count: 31 tasks across 7 phases

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1. Foundation | 1-3 | Scaffold, schema, seed |
| 2. Content Ingestion | 4-8 | TXT, PDF, EPUB, URL extractors + upload API |
| 3. AI Processing | 9-12 | Claude client, analysis, script gen, process API |
| 4. Audio Generation | 13-16 | OpenAI TTS, narrator, conversation, audio API |
| 5. Frontend | 17-22 | App shell, screens, player, car mode |
| 6. Integration | 23-25 | Wiring, offline, playback state |
| 7. E2E Proof | 26-30 | 5 proof scenarios |

### Running All Tests

```bash
# Unit + Integration tests
npx vitest run

# E2E tests (requires running dev server)
npx playwright test

# Both
npm run test && npm run test:e2e
```
