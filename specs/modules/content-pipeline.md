# Module: Content Pipeline

> The single pipeline that defines ridecast2: Upload → Extract → Analyze → Script → TTS → Play.

Reference: [specs/architecture.md](../architecture.md) for full tech stack and module tree.

## Purpose

Transform uploaded content (PDF, EPUB, TXT, URL) into AI-compressed audio podcasts. This module spec captures the stable interfaces, API contracts, and data model that all work on this project must respect.

---

## Data Model (Prisma)

```
User 1──* Content 1──* Script 1──* Audio
User 1──* PlaybackState *──1 Audio
```

| Model | Key Fields | Constraints |
|-------|-----------|-------------|
| `User` | `id` (uuid), `name` | Default: `"Default User"`, id: `"default-user"` at runtime |
| `Content` | `title`, `rawText`, `wordCount`, `sourceType`, `contentHash` | `contentHash` UNIQUE (dedup) |
| `Script` | `format` (`narrator`\|`conversation`), `targetDuration` (min), `scriptText`, `themes[]` | FK → Content |
| `Audio` | `filePath`, `durationSecs`, `voices[]`, `ttsProvider` | FK → Script |
| `PlaybackState` | `position` (secs), `speed`, `completed` | `@@unique(userId, audioId)` |

Schema source: `prisma/schema.prisma`

---

## Provider Interfaces

### AIProvider (`src/lib/ai/types.ts`)

```typescript
interface ContentAnalysis {
  contentType: string;
  format: 'narrator' | 'conversation';
  themes: string[];
  summary: string;
}

interface ScriptConfig {
  format: 'narrator' | 'conversation';
  targetMinutes: number;
  contentType: string;
  themes: string[];
}

interface GeneratedScript {
  text: string;
  wordCount: number;
  format: 'narrator' | 'conversation';
}

interface AIProvider {
  analyze(text: string): Promise<ContentAnalysis>;
  generateScript(text: string, config: ScriptConfig): Promise<GeneratedScript>;
}
```

Implementation: `ClaudeProvider` in `src/lib/ai/claude.ts`. Requires `ANTHROPIC_API_KEY`.

### TTSProvider (`src/lib/tts/types.ts`)

```typescript
interface VoiceConfig {
  voice: string;
  instructions: string;
}

interface TTSProvider {
  generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer>;
}
```

Implementation: `src/lib/tts/openai.ts`. Requires `OPENAI_API_KEY`.

Voice routing:
- `narrator` format → single voice via `src/lib/tts/narrator.ts`
- `conversation` format → Host A / Host B voices via `src/lib/tts/conversation.ts`

### Content Extraction (`src/lib/extractors/index.ts`)

```typescript
interface ExtractionResult {
  title: string;
  text: string;
  wordCount: number;
  author?: string;
}

function extractContent(
  input: Buffer | string,
  filename: string,
  sourceType: 'txt' | 'pdf' | 'epub'
): Promise<ExtractionResult>;

function extractUrl(url: string): Promise<ExtractionResult>;
```

Dispatches to `txt.ts`, `pdf.ts`, `epub.ts` by `sourceType`. URL extraction is separate (`url.ts`, uses `@mozilla/readability` + `jsdom`).

### Script Parser (`src/lib/utils/script-parser.ts`)

```typescript
interface ScriptSegment {
  speaker: string;
  text: string;
}

function parseConversationScript(script: string): ScriptSegment[];
```

Parses `[Host A]` / `[Host B]` labels. Falls back to single `"narrator"` segment if no labels found.

---

## API Routes

All routes use `DEFAULT_USER_ID = "default-user"` (no auth).

### POST `/api/upload`

Upload content for extraction.

| Field | Type | Notes |
|-------|------|-------|
| **Request** | `multipart/form-data` | `file` (binary) OR `url` (string) |
| **Response 200** | `Content` record (JSON) | Created content with extracted text |
| **Response 409** | `{ error: string, existingId: string }` | Duplicate content (matching `contentHash`) |

Flow: receive file/URL → extract text → hash → check dedup → create Content record.

### POST `/api/process`

AI analysis + script generation.

| Field | Type | Notes |
|-------|------|-------|
| **Request** | `{ contentId: string, targetMinutes: number }` | JSON body |
| **Response 200** | `Script` record (JSON) | Generated script with themes, format |
| **Requires** | `ANTHROPIC_API_KEY` | Claude API call |

Flow: load Content → `AIProvider.analyze()` → `AIProvider.generateScript()` → create Script record.

### POST `/api/audio/generate`

TTS audio generation.

| Field | Type | Notes |
|-------|------|-------|
| **Request** | `{ scriptId: string }` | JSON body |
| **Response 200** | `Audio` record (JSON) | Generated audio metadata |
| **Requires** | `OPENAI_API_KEY` | OpenAI TTS API call |

Flow: load Script → parse segments → route to narrator/conversation TTS → write mp3 → create Audio record.

### GET `/api/audio/[id]`

Stream audio file.

| Field | Type | Notes |
|-------|------|-------|
| **Response 200** | Binary `audio/mpeg` | Raw mp3 stream |
| **Response 404** | Error | Audio record or file not found |

### GET `/api/library`

User's content library.

| Field | Type | Notes |
|-------|------|-------|
| **Response 200** | `LibraryItem[]` | Content + status + `audioUrl` if generated |

Returns joined Content→Script→Audio with pipeline status per item.

### GET/POST `/api/playback`

Playback state persistence.

| Field | Type | Notes |
|-------|------|-------|
| **GET params** | `?userId&audioId` | Retrieve saved state |
| **POST body** | `{ userId, audioId, position, speed, completed }` | Upsert state |
| **Response 200** | `PlaybackState` record | Current or updated state |

Keyed by `@@unique(userId, audioId)`.

---

## Key Patterns

| Pattern | Implementation | Constraint |
|---------|---------------|------------|
| Provider interfaces | `AIProvider`, `TTSProvider` | New providers must implement these interfaces exactly |
| Content dedup | `contentHash` unique index | Upload route MUST hash and check before insert |
| Singleton DB | `src/lib/db.ts` | Single Prisma instance; never instantiate elsewhere |
| Default user | `DEFAULT_USER_ID = "default-user"` | Hardcoded in API routes; no auth layer |
| Colocated tests | `*.test.ts` next to source | Tests live beside their module, not in a separate tree |
| Script formats | `narrator` \| `conversation` | Only two formats; affects TTS voice routing |

---

## Dependencies

| Dependency | Used by | Version |
|-----------|---------|---------|
| `@anthropic-ai/sdk` | `ClaudeProvider` | ^0.78.0 |
| `openai` | TTS provider | ^6.25.0 |
| `@prisma/client` | All DB access | ^7.4.1 |
| `pdf-parse` | PDF extractor | ^1.1.1 |
| `jszip` | EPUB extractor | ^3.10.1 |
| `@mozilla/readability` + `jsdom` | URL extractor | ^0.6.0 / ^28.1.0 |
| `uuid` | ID generation | ^13.0.0 |
| `dexie` | Offline audio cache (client) | ^4.3.0 |

---

## Boundary Rules

1. **Server-side logic** lives in `src/lib/`. Never import from `src/components/`.
2. **Client components** live in `src/components/` with `"use client"`. Never import Prisma or server libs.
3. **API routes** are the boundary between client and server. All client→server communication goes through `/api/*`.
4. **Provider implementations** are hidden behind interfaces. Callers import types, not concrete classes.
5. **Prisma schema** is the single source of truth for data model. No shadow types.