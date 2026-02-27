# AI Provider Interface + Claude Client Implementation Plan

> **Execution:** Use the subagent-driven-development workflow to implement this plan.

> **QUALITY LOOP WARNING:** The automated quality review loop exhausted after 3
> iterations without approval, even though the final verdict was **APPROVED** with
> no critical or important issues. Human reviewer: please verify the implementation
> matches this plan during the approval gate. The code itself was assessed as clean
> and well-tested — the loop exhaustion appears to be a process issue, not a code
> quality issue.

**Goal:** Create the AI provider abstraction layer and Claude implementation for content analysis and script generation.

**Architecture:** A TypeScript interface (`AIProvider`) defines the contract for analyzing content and generating scripts. A concrete `ClaudeProvider` class implements this interface using the Anthropic SDK. The interface enables swapping AI providers later without changing calling code. Two-step pipeline: (1) analyze content to classify type and choose format, (2) generate a narrator or conversation script at a target duration.

**Tech Stack:** TypeScript, Anthropic Claude SDK (`@anthropic-ai/sdk` — already installed), Vitest

**Dependencies:** Task 1 (project scaffolding) must be complete — `vitest.config.ts`, `tsconfig.json`, and `@anthropic-ai/sdk` must be present.

---

### Task 1: Create AI type definitions

**Files:**
- Create: `src/lib/ai/types.ts`

**Step 1: Create the types file**

Create `src/lib/ai/types.ts` with exactly this content:

```typescript
export interface ContentAnalysis {
  contentType: string;
  format: 'narrator' | 'conversation';
  themes: string[];
  summary: string;
}

export interface ScriptConfig {
  format: 'narrator' | 'conversation';
  targetMinutes: number;
  contentType: string;
  themes: string[];
}

export interface GeneratedScript {
  text: string;
  wordCount: number;
  format: 'narrator' | 'conversation';
}

export interface AIProvider {
  analyze(text: string): Promise<ContentAnalysis>;
  generateScript(text: string, config: ScriptConfig): Promise<GeneratedScript>;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/chrispark/Projects/ridecast2 && npx tsc --noEmit src/lib/ai/types.ts`
Expected: No errors

**Step 3: Commit**

```
git add src/lib/ai/types.ts
git commit -m "feat: add AIProvider interface and type definitions for content analysis and script generation"
```

---

### Task 2: Write failing tests for ClaudeProvider

**Files:**
- Create: `src/lib/ai/claude.test.ts`

**Step 1: Write the test file**

Create `src/lib/ai/claude.test.ts` with exactly this content:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeProvider } from './claude';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    mockCreate.mockReset();
    provider = new ClaudeProvider('test-api-key');
  });

  describe('analyze()', () => {
    it('returns content analysis with contentType, format, themes, and summary', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              contentType: 'business_book',
              format: 'conversation',
              themes: ['productivity', 'management', 'leadership'],
              summary: 'A book about effective business practices and productivity.',
            }),
          },
        ],
      });

      const result = await provider.analyze('Some text about business and productivity...');

      expect(result.contentType).toBe('business_book');
      expect(result.format).toBe('conversation');
      expect(result.themes).toContain('productivity');
      expect(result.summary).toBeTruthy();
    });
  });

  describe('generateScript()', () => {
    it('returns narrator script with text, format, and wordCount > 0', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Welcome to this episode where we explore the key ideas from this fascinating book about productivity and management.',
          },
        ],
      });

      const result = await provider.generateScript('Some source text...', {
        format: 'narrator',
        targetMinutes: 5,
        contentType: 'business_book',
        themes: ['productivity'],
      });

      expect(result.text).toBeTruthy();
      expect(result.format).toBe('narrator');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('returns conversation script with [Host A] and [Host B] labels', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '[Host A] Hey, welcome to the show! Today we are diving into something really cool.\n[Host B] Absolutely. This book has some fascinating insights about productivity.\n[Host A] Let us break it down for our listeners.',
          },
        ],
      });

      const result = await provider.generateScript('Some source text...', {
        format: 'conversation',
        targetMinutes: 5,
        contentType: 'business_book',
        themes: ['productivity'],
      });

      expect(result.text).toContain('[Host A]');
      expect(result.text).toContain('[Host B]');
      expect(result.format).toBe('conversation');
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('throws on empty content array from analyze()', async () => {
      mockCreate.mockResolvedValue({ content: [] });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Unexpected response type from Claude',
      );
    });

    it('throws on non-text content block from generateScript()', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
      });

      await expect(
        provider.generateScript('Some text', {
          format: 'narrator',
          targetMinutes: 5,
          contentType: 'business_book',
          themes: ['productivity'],
        }),
      ).rejects.toThrow('Unexpected response type from Claude');
    });

    it('throws descriptive error on malformed JSON from analyze()', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Not valid JSON at all' }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Failed to parse analysis response: Not valid JSON at all',
      );
    });

    it('throws on malformed analysis missing required fields', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ contentType: 'business_book' }),
          },
        ],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Invalid analysis response: missing required fields',
      );
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/chrispark/Projects/ridecast2 && npx vitest run src/lib/ai/claude.test.ts`
Expected: FAIL — `Cannot find module './claude'` (or similar import error since `claude.ts` doesn't exist yet)

---

### Task 3: Implement ClaudeProvider

**Files:**
- Create: `src/lib/ai/claude.ts`

**Step 1: Create the implementation file**

Create `src/lib/ai/claude.ts` with exactly this content:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ContentAnalysis, ScriptConfig, GeneratedScript } from './types';

const MODEL = 'claude-sonnet-4-20250514';
const WORDS_PER_MINUTE = 150;
const ANALYSIS_MAX_TOKENS = 1024;
const SCRIPT_MAX_TOKENS = 4096;
const MAX_ANALYSIS_CHARS = 3000;

const CONTENT_TYPES = [
  'business_book',
  'science_article',
  'news_article',
  'technical_paper',
  'fiction',
  'biography',
  'self_help',
  'educational',
] as const;

function isContentAnalysis(value: unknown): value is ContentAnalysis {
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.contentType === 'string' &&
    (obj.format === 'narrator' || obj.format === 'conversation') &&
    Array.isArray(obj.themes) &&
    typeof obj.summary === 'string'
  );
}

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(text: string): Promise<ContentAnalysis> {
    const truncated = text.slice(0, MAX_ANALYSIS_CHARS);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: ANALYSIS_MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: `Analyze the following text and return a JSON object with these fields:
- contentType: one of ${CONTENT_TYPES.map((t) => `"${t}"`).join(', ')}
- format: either "narrator" or "conversation" (choose based on what would work best for an audio podcast)
- themes: an array of 3-5 key themes
- summary: a brief summary of the content

Return ONLY the JSON object, no other text.

Text:
${truncated}`,
        },
      ],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content.text);
    } catch {
      throw new Error(`Failed to parse analysis response: ${content.text.slice(0, 200)}`);
    }

    if (!isContentAnalysis(parsed)) {
      throw new Error('Invalid analysis response: missing required fields');
    }

    return parsed;
  }

  async generateScript(text: string, config: ScriptConfig): Promise<GeneratedScript> {
    const targetWords = config.targetMinutes * WORDS_PER_MINUTE;

    const prompt =
      config.format === 'narrator'
        ? `Create a clean, spoken-word podcast script summarizing the following content.

Requirements:
- Target approximately ${targetWords} words
- Write in a natural, engaging narrator voice
- Do NOT use any speaker labels
- Content type: ${config.contentType}
- Key themes to cover: ${config.themes.join(', ')}

Source text:
${text}`
        : `Create a two-speaker podcast conversation script about the following content.

Requirements:
- Target approximately ${targetWords} words
- Use exactly two speakers labeled [Host A] and [Host B]
- [Host A] is curious and energetic
- [Host B] is thoughtful and expert
- Content type: ${config.contentType}
- Key themes to cover: ${config.themes.join(', ')}

Source text:
${text}`;

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: SCRIPT_MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const scriptText = content.text.trim();
    const wordCount = scriptText.split(/\s+/).filter(Boolean).length;

    return {
      text: scriptText,
      wordCount,
      format: config.format,
    };
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `cd /Users/chrispark/Projects/ridecast2 && npx vitest run src/lib/ai/claude.test.ts`
Expected: PASS — 7 tests (3 happy path + 4 error handling)

**Step 3: Verify TypeScript compiles cleanly**

Run: `cd /Users/chrispark/Projects/ridecast2 && npx tsc --noEmit`
Expected: No errors

**Step 4: Run full test suite to check for regressions**

Run: `cd /Users/chrispark/Projects/ridecast2 && npx vitest run`
Expected: All tests pass (existing + 7 new)

**Step 5: Commit**

```
git add src/lib/ai/claude.ts src/lib/ai/claude.test.ts
git commit -m "feat: AI provider interface + Claude client for analysis and script generation"
```

---

## Acceptance Criteria Checklist

- [ ] 7 tests pass in `claude.test.ts` (3 happy path + 4 error handling)
- [ ] `AIProvider` interface defined with `analyze()` and `generateScript()` methods
- [ ] `ClaudeProvider` implements both methods with proper prompts
- [ ] Content type detection supports 8 categories (`business_book`, `science_article`, `news_article`, `technical_paper`, `fiction`, `biography`, `self_help`, `educational`)
- [ ] Conversation format uses `[Host A]`/`[Host B]` labels
- [ ] `WORDS_PER_MINUTE = 150` used for target word count calculation
- [ ] `claude-sonnet-4-20250514` model used
- [ ] Type guard `isContentAnalysis()` validates runtime response shape
- [ ] Three error paths in `analyze()`: empty/non-text response, JSON parse failure, missing required fields
- [ ] `tsc --noEmit` compiles cleanly
- [ ] Full test suite passes with no regressions