import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL } from './types';
import { retryWithBackoff } from '@/lib/utils/retry';
import { stripJsonMarkdownFences, asRecord } from '@/lib/utils/json';

let _client: Anthropic | undefined;
function getClient(): Anthropic {
  return (_client ??= new Anthropic());
}

const FEEDBACK_CATEGORIES = [
  'Bug',
  'UX Friction',
  'Feature Request',
  'Content Quality',
  'Playback Issue',
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

const FEEDBACK_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number];

// Pre-computed prompt strings — derived from the above constants but stable,
// so we hoist them to module scope rather than re-joining on every call.
const CATEGORY_LIST = FEEDBACK_CATEGORIES.map(c => `"${c}"`).join(', ');
const PRIORITY_LIST = FEEDBACK_PRIORITIES.map(p => `"${p}"`).join(', ');

export interface FeedbackAnalysis {
  category: FeedbackCategory;
  summary: string;
  priority: FeedbackPriority;
  duplicateOf: string | null;
}

export interface FeedbackInput {
  text: string;
  screenContext: string;
  episodeId?: string | null;
  telemetryEvents?: Array<{ eventType: string; metadata: unknown }>;
}

function isFeedbackAnalysis(value: unknown): value is FeedbackAnalysis {
  const obj = asRecord(value);
  if (!obj) return false;
  return (
    FEEDBACK_CATEGORIES.includes(obj.category as FeedbackCategory) &&
    typeof obj.summary === 'string' &&
    FEEDBACK_PRIORITIES.includes(obj.priority as FeedbackPriority) &&
    (obj.duplicateOf === null || typeof obj.duplicateOf === 'string')
  );
}

export async function categorizeFeedback(input: FeedbackInput): Promise<FeedbackAnalysis> {
  const telemetryContext = input.telemetryEvents?.length
    ? `\n\nRecent telemetry events from this user (last hour):\n${input.telemetryEvents.map(e => `- ${e.eventType}: ${JSON.stringify(e.metadata)}`).join('\n')}`
    : '';

  const response = await retryWithBackoff(() => getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Categorize this user feedback from the Ridecast podcast app.\n\nFeedback: "${input.text}"\nScreen: ${input.screenContext}${input.episodeId ? `\nEpisode: ${input.episodeId}` : ''}${telemetryContext}\n\nReturn a JSON object with:\n- category: one of ${CATEGORY_LIST}\n- summary: one-line actionable summary (max 100 chars)\n- priority: one of ${PRIORITY_LIST}\n- duplicateOf: feedback ID if this matches known feedback, or null\n\nReturn ONLY the JSON object, no other text.`,
    }],
  }));

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const cleaned = stripJsonMarkdownFences(content.text);

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
