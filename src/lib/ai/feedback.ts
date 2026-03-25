import Anthropic from '@anthropic-ai/sdk';
import { retryWithBackoff } from '@/lib/utils/retry';

const MODEL = 'claude-sonnet-4-20250514';

export interface FeedbackAnalysis {
  category: string;
  summary: string;
  priority: string;
  duplicateOf: string | null;
}

export interface FeedbackInput {
  text: string;
  screenContext: string;
  episodeId?: string | null;
  telemetryEvents?: Array<{ eventType: string; metadata: unknown; createdAt: Date }>;
}

function isFeedbackAnalysis(value: unknown): value is FeedbackAnalysis {
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.category === 'string' &&
    typeof obj.summary === 'string' &&
    typeof obj.priority === 'string' &&
    (obj.duplicateOf === null || typeof obj.duplicateOf === 'string')
  );
}

export async function categorizeFeedback(input: FeedbackInput): Promise<FeedbackAnalysis> {
  const client = new Anthropic();

  const telemetryContext = input.telemetryEvents?.length
    ? `\n\nRecent telemetry events from this user (last hour):\n${input.telemetryEvents.map(e => `- ${e.eventType}: ${JSON.stringify(e.metadata)}`).join('\n')}`
    : '';

  const response = await retryWithBackoff(() => client.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Categorize this user feedback from the Ridecast podcast app.\n\nFeedback: "${input.text}"\nScreen: ${input.screenContext}${input.episodeId ? `\nEpisode: ${input.episodeId}` : ''}${telemetryContext}\n\nReturn a JSON object with:\n- category: one of "Bug", "UX Friction", "Feature Request", "Content Quality", "Playback Issue"\n- summary: one-line actionable summary (max 100 chars)\n- priority: one of "Critical", "High", "Medium", "Low"\n- duplicateOf: feedback ID if this matches known feedback, or null\n\nReturn ONLY the JSON object, no other text.`,
    }],
  }));

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const cleaned = content.text
    .replace(/^```(?:json)?\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse feedback analysis: ${cleaned.slice(0, 200)}`);
  }

  if (!isFeedbackAnalysis(parsed)) {
    throw new Error('Invalid feedback analysis: missing required fields');
  }

  return parsed;
}
