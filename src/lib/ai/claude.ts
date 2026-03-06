import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ContentAnalysis, ScriptConfig, GeneratedScript } from './types';
import { WORDS_PER_MINUTE } from '@/lib/utils/duration';
import { retryWithBackoff } from '@/lib/utils/retry';

const MODEL = 'claude-sonnet-4-20250514';
const ANALYSIS_MAX_TOKENS = 1024;
const MAX_ANALYSIS_CHARS = 3000;
// Claude's context window is 200K tokens (~800K chars). Reserve space for
// the prompt template and the generated output, leaving ~600K for source text.
const MAX_SCRIPT_SOURCE_CHARS = 600_000;

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

  constructor() {
    this.client = new Anthropic();
  }

  async analyze(text: string): Promise<ContentAnalysis> {
    const truncated = text.slice(0, MAX_ANALYSIS_CHARS);

    const response = await retryWithBackoff(() => this.client.messages.create({
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
    }));

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Claude often wraps JSON in markdown fences (```json ... ```) despite
    // being asked for raw JSON. Strip them before parsing.
    const cleaned = content.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse analysis response: ${cleaned.slice(0, 200)}`);
    }

    if (!isContentAnalysis(parsed)) {
      throw new Error('Invalid analysis response: missing required fields');
    }

    return parsed;
  }

  async generateScript(text: string, config: ScriptConfig): Promise<GeneratedScript> {
    const targetWords = config.targetMinutes * WORDS_PER_MINUTE;
    const minWords = Math.round(targetWords * 0.85);
    const maxWords = Math.round(targetWords * 1.15);

    // Truncate to stay within Claude's context window. For very large
    // documents the beginning is usually enough for a good summary.
    const sourceText = text.length > MAX_SCRIPT_SOURCE_CHARS
      ? text.slice(0, MAX_SCRIPT_SOURCE_CHARS) + '\n\n[Content truncated for length]'
      : text;

    const prompt = this.buildScriptPrompt(config, targetWords, sourceText);

    let result = await this.callGenerateScript(prompt, targetWords);

    // Validate word count. If outside ±15% tolerance, retry with explicit
    // correction. First retry uses soft guidance; second retry uses a hard
    // constraint. Two retries maximum — LLMs are stochastic.
    if (result.wordCount < minWords || result.wordCount > maxWords) {
      const direction = result.wordCount < minWords ? 'short' : 'long';
      const guidance = direction === 'short'
        ? 'Expand ideas further, add more examples, and develop each point in greater depth.'
        : 'Compress more aggressively. Focus only on the most important points and cut secondary details.';

      console.log(
        `[duration] Script ${direction}: ${result.wordCount} words vs ${targetWords} target ` +
        `(${config.targetMinutes} min). Retrying with correction.`
      );

      const correctionPrompt = `${prompt}

IMPORTANT CORRECTION: Your script must be between ${minWords} and ${maxWords} words. The target is ${targetWords} words (${config.targetMinutes} minutes at ${WORDS_PER_MINUTE} words per minute). ${guidance}`;

      result = await this.callGenerateScript(correctionPrompt, targetWords);

      if (result.wordCount < minWords || result.wordCount > maxWords) {
        console.log(
          `[duration] Script still ${result.wordCount < minWords ? 'short' : 'long'} after first retry: ` +
          `${result.wordCount} words vs ${targetWords} target. Applying hard constraint.`
        );

        // Second retry: hard constraint with explicit word count requirement.
        const hardConstraintPrompt = `${prompt}

HARD CONSTRAINT — DO NOT EXCEED OR FALL SHORT: Your script must contain between ${minWords} and ${maxWords} words. Count your words carefully before finishing. The target is EXACTLY ${targetWords} words.`;

        result = await this.callGenerateScript(hardConstraintPrompt, targetWords);

        if (result.wordCount < minWords || result.wordCount > maxWords) {
          console.warn(
            `[duration] Script still ${result.wordCount < minWords ? 'short' : 'long'} after all retries: ` +
            `${result.wordCount} words vs ${targetWords} target. Proceeding with best effort.`
          );
        } else {
          console.log(
            `[duration] Hard constraint retry succeeded: ${result.wordCount} words (target: ${targetWords}).`
          );
        }
      } else {
        console.log(
          `[duration] Retry succeeded: ${result.wordCount} words (target: ${targetWords}).`
        );
      }
    }

    return {
      text: result.text,
      wordCount: result.wordCount,
      format: config.format,
    };
  }

  private buildScriptPrompt(
    config: ScriptConfig,
    targetWords: number,
    sourceText: string,
  ): string {
    const minWords = Math.round(targetWords * 0.85);
    const maxWords = Math.round(targetWords * 1.15);

    return config.format === 'narrator'
      ? `Create a spoken-word podcast script summarizing the following content.

Length: The listener expects about ${config.targetMinutes} minutes of audio. At ${WORDS_PER_MINUTE} words per minute, write between ${minWords} and ${maxWords} words (target: ${targetWords}). Don't be dramatically shorter — a 4-minute script for a 15-minute target leaves the listener with nothing for most of their commute. Develop ideas fully, use examples, and give key points room to breathe.

Style:
- Natural, engaging narrator voice
- No speaker labels
- Content type: ${config.contentType}
- Key themes to cover: ${config.themes.join(', ')}

Source text:
${sourceText}`
      : `Create a two-speaker podcast conversation script about the following content.

Length: The listener expects about ${config.targetMinutes} minutes of audio. At ${WORDS_PER_MINUTE} words per minute, write between ${minWords} and ${maxWords} words (target: ${targetWords}). Don't be dramatically shorter — a 4-minute script for a 15-minute target leaves the listener with nothing for most of their commute. Let the conversation develop naturally, explore tangents, and give ideas room to breathe.

Style:
- Use exactly two speakers labeled [Host A] and [Host B]
- [Host A] is curious and energetic
- [Host B] is thoughtful and expert
- Content type: ${config.contentType}
- Key themes to cover: ${config.themes.join(', ')}

Source text:
${sourceText}`;
  }

  private async callGenerateScript(
    prompt: string,
    targetWords: number,
  ): Promise<{ text: string; wordCount: number }> {
    const response = await retryWithBackoff(() => this.client.messages.create({
      model: MODEL,
      max_tokens: Math.max(targetWords * 2, 2048),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }));

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const text = content.text.trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return { text, wordCount };
  }
}