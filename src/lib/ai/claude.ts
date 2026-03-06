import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ContentAnalysis, ScriptConfig, GeneratedScript } from './types';

const MODEL = 'claude-sonnet-4-20250514';
const WORDS_PER_MINUTE = 150;
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

    // Truncate to stay within Claude's context window. For very large
    // documents the beginning is usually enough for a good summary.
    const sourceText = text.length > MAX_SCRIPT_SOURCE_CHARS
      ? text.slice(0, MAX_SCRIPT_SOURCE_CHARS) + '\n\n[Content truncated for length]'
      : text;

    const prompt =
      config.format === 'narrator'
        ? `Create a spoken-word podcast script summarizing the following content.

Length: The listener expects about ${config.targetMinutes} minutes of audio. At 150 words per minute, aim for around ${targetWords} words. It's fine to be somewhat over or under, but don't be dramatically shorter — a 4-minute script for a 15-minute target leaves the listener with nothing for most of their commute. Develop ideas fully, use examples, and give key points room to breathe.

Style:
- Natural, engaging narrator voice
- No speaker labels
- Content type: ${config.contentType}
- Key themes to cover: ${config.themes.join(', ')}

Source text:
${sourceText}`
        : `Create a two-speaker podcast conversation script about the following content.

Length: The listener expects about ${config.targetMinutes} minutes of audio. At 150 words per minute, aim for around ${targetWords} words. It's fine to be somewhat over or under, but don't be dramatically shorter — a 4-minute script for a 15-minute target leaves the listener with nothing for most of their commute. Let the conversation develop naturally, explore tangents, and give ideas room to breathe.

Style:
- Use exactly two speakers labeled [Host A] and [Host B]
- [Host A] is curious and energetic
- [Host B] is thoughtful and expert
- Content type: ${config.contentType}
- Key themes to cover: ${config.themes.join(', ')}

Source text:
${sourceText}`;

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: targetWords * 2,
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