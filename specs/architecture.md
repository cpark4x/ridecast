# Ridecast2 Architecture

> Turn any content (PDF, EPUB, TXT, URL) into AI-compressed audio for commutes.

## Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router) | 16.1.x |
| Language | TypeScript (strict) | 5.x |
| UI | React + TailwindCSS | 19.x / 4.x |
| Database | PostgreSQL via Prisma | PG 16 / Prisma 7 |
| AI | Anthropic Claude (analysis + script) | SDK 0.78 |
| TTS | OpenAI speech API | SDK 6.x |
| Unit tests | Vitest + Testing Library | 4.x |
| E2E tests | Playwright (Chromium) | 1.58 |
| Offline | Dexie (IndexedDB) | 4.x |

## Data Model (Prisma)

```
User 1──* Content 1──* Script 1──* Audio
User 1──* PlaybackState *──1 Audio
```

| Model | Key fields | Role |
|-------|-----------|------|
| `User` | id, name | Single-user for now (`default-user`) |
| `Content` | rawText, wordCount, sourceType, contentHash (unique) | Uploaded/extracted source material |
| `Script` | format (`narrator`\|`conversation`), targetDuration, scriptText, themes[] | AI-generated podcast script |
| `Audio` | filePath, durationSecs, voices[], ttsProvider | Generated audio file reference |
| `PlaybackState` | position, speed, completed; @@unique(userId, audioId) | Resume/speed persistence |

## Module Boundaries

```
src/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── upload/route.ts     # POST: file/URL → Content record
│   │   ├── process/route.ts    # POST: Content → AI analyze → Script record
│   │   ├── audio/
│   │   │   ├── generate/route.ts  # POST: Script → TTS → Audio record
│   │   │   └── [id]/route.ts     # GET: stream audio file
│   │   ├── library/route.ts    # GET: user's content list + status
│   │   └── playback/route.ts   # GET/POST: playback state CRUD
│   ├── layout.tsx              # Root layout (PlayerProvider wrapper)
│   └── page.tsx                # → AppShell
│
├── components/                 # Client-side React (all "use client")
│   ├── AppShell.tsx            # Tab router: Upload | Library | Processing
│   ├── UploadScreen.tsx        # File/URL input → /api/upload
│   ├── ProcessingScreen.tsx    # Config + progress → /api/process + /api/audio/generate
│   ├── LibraryScreen.tsx       # Content list → play
│   ├── PlayerBar.tsx           # Mini player (bottom)
│   ├── ExpandedPlayer.tsx      # Full player with controls
│   ├── CarMode.tsx             # Large-button driving mode
│   ├── BottomNav.tsx           # Tab navigation
│   └── PlayerContext.tsx       # Audio state provider (usePlayer hook)
│
├── lib/                        # Server-side business logic
│   ├── db.ts                   # Prisma singleton (PrismaPg adapter)
│   ├── ai/
│   │   ├── types.ts            # AIProvider interface, ContentAnalysis, ScriptConfig
│   │   └── claude.ts           # ClaudeProvider implements AIProvider
│   ├── tts/
│   │   ├── types.ts            # TTSProvider interface, VoiceConfig
│   │   ├── openai.ts           # OpenAI TTS implementation
│   │   ├── narrator.ts         # Single-voice generation
│   │   └── conversation.ts     # Multi-voice (Host A / Host B)
│   ├── extractors/
│   │   ├── types.ts            # ExtractionResult
│   │   ├── index.ts            # extractContent dispatcher
│   │   ├── pdf.ts / epub.ts / txt.ts / url.ts
│   │   └── pdf-parse.d.ts     # Type shim
│   ├── utils/
│   │   ├── hash.ts             # Content dedup hash
│   │   ├── duration.ts         # Time formatting
│   │   └── script-parser.ts    # Parse [Host A]/[Host B] segments
│   └── offline/
│       └── cache.ts            # Dexie-based audio caching
│
├── generated/prisma/           # Prisma client (gitignored-ish, generated)
└── test-setup.ts               # Vitest global setup
```

## Key Patterns

| Pattern | Where | Why |
|---------|-------|-----|
| Provider interface | `AIProvider`, `TTSProvider` | Swap implementations without changing callers |
| Singleton DB | `src/lib/db.ts` | Prevent connection leaks in dev HMR |
| Content hashing | Upload route + `contentHash` unique | Dedup uploads |
| Colocated tests | `*.test.ts` next to source | Fast discovery, easy deletion |
| Client context | `PlayerContext` + `usePlayer` | Share audio state across components |
| Default user | `DEFAULT_USER_ID = "default-user"` | No auth yet; single-user MVP |

## Pipeline (the one feature)

```
Upload → Extract text → AI analyze → Generate script → TTS audio → Play
  POST /upload  →  POST /process  →  POST /audio/generate  →  GET /audio/[id]
```

## Commands

```bash
# Dev
npm run dev                     # Next.js dev server (port 3000)
docker compose up -d            # Local Postgres (port 5432)

# Database
npm run db:migrate              # prisma migrate dev
npm run db:generate             # prisma generate
npm run db:seed                 # npx tsx prisma/seed.ts
npm run db:studio               # prisma studio

# Verify (run in order)
npm run lint                    # ESLint
npm run test                    # Vitest (unit + integration)
npm run build                   # Next.js production build
npm run test:e2e                # Playwright (requires dev server)
```

## Environment

```bash
DATABASE_URL="postgresql://postgres:ridecast@localhost:5432/ridecast"
ANTHROPIC_API_KEY="sk-ant-xxx"  # Required for /api/process
OPENAI_API_KEY="sk-xxx"         # Required for /api/audio/generate
```

## Current Status

| Check | Status | Notes |
|-------|--------|-------|
| `npm run lint` | PASS | 10 non-blocking `no-unused-vars` warnings |
| `npm run test` | PASS | 58/65 pass, 7 skipped (DB-dependent) |
| `npm run build` | PASS | Turbopack, non-blocking warnings |
| `npm run test:e2e` | FAIL | 0/5 — two fixable selector patterns |
