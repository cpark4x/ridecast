import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ContentAnalysis, ScriptConfig, GeneratedScript } from './types';

const MODEL = 'claude-sonnet-4-20250514';
const WORDS_PER_MINUTE = 150;

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(text: string): Promise<ContentAnalysis> {
    const truncated = text.slice(0, 3000);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze the following text and return a JSON object with these fields:
- contentType: one of "business_book", "science_article", "news_article", "technical_paper", "fiction", "biography", "self_help", "educational"
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

    try {
      return JSON.parse(content.text) as ContentAnalysis;
    } catch {
      throw new Error(`Failed to parse analysis response: ${content.text.slice(0, 200)}`);
    }
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
      max_tokens: 4096,
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