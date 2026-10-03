import { isSeverity, severityLabel } from '@/features/today/check-in';
import type { ChatHistoryRow, ChatResponse } from '@/lib/api/chat';
import { formatLongDate } from '@/lib/dates';
import { severityColors } from '@/theme/tokens';

const UNRATED_DOT = '#C9CDD2';

export type ChipObservation = {
  key: string;
  symptomCode: string | null;
  customLabel: string | null;
  severity: number | null;
  durationDays: number | null;
  observedOn: string;
};

export type ChatItem = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  inputMode: 'text' | 'voice';
  localDate: string;
  observations: readonly ChipObservation[];
  /** `streaming`: an assistant reply still arriving token by token. */
  status: 'sent' | 'sending' | 'streaming' | 'failed';
  /** Patient-safe text, set when `status` is `failed`. */
  error?: string;
};

type HistoryObservation = ChatHistoryRow['observations'][number];

function toChip(observation: HistoryObservation): ChipObservation {
  return {
    key: observation.id,
    symptomCode: observation.symptom_code,
    customLabel: observation.custom_label,
    severity: observation.severity,
    durationDays: observation.duration_days,
    observedOn: observation.observed_on,
  };
}

/**
 * Oldest-first thread from newest-first rows. Observations show under the assistant reply that answered
 * them, whether the function linked them to the patient's message or to its own reply.
 */
export function fromHistory(rows: readonly ChatHistoryRow[]): ChatItem[] {
  const items: ChatItem[] = [];
  let carried: ChipObservation[] = [];
  for (const row of [...rows].reverse()) {
    const chips = [...carried, ...row.observations.map(toChip)];
    const isAssistant = row.role === 'assistant';
    carried = isAssistant ? [] : chips;
    items.push({
      id: row.id,
      role: isAssistant ? 'assistant' : 'user',
      content: row.content,
      inputMode: row.input_mode === 'voice' ? 'voice' : 'text',
      localDate: row.local_date,
      observations: isAssistant ? chips : [],
      status: 'sent',
    });
  }
  return items;
}

export type SendVars = { id: string; message: string; localDate: string; inputMode?: ChatItem['inputMode'] };

export function userItem({ id, message, localDate, inputMode = 'text' }: SendVars): ChatItem {
  return { id, role: 'user', content: message, inputMode, localDate, observations: [], status: 'sending' };
}

export function assistantItem(response: ChatResponse, localDate: string): ChatItem {
  return {
    id: response.message_id,
    role: 'assistant',
    content: response.reply,
    inputMode: 'text',
    localDate,
    observations: response.observations.map((observation, index) => ({
      key: `${response.message_id}-${index}`,
      symptomCode: observation.symptom_code ?? null,
      customLabel: observation.custom_label ?? null,
      severity: observation.severity ?? null,
      durationDays: observation.duration_days ?? null,
      observedOn: observation.observed_on ?? localDate,
    })),
    status: 'sent',
  };
}

/** Moves the item to the end with new fields (retry re-sends it as the newest message). */
export function upsertLast(items: readonly ChatItem[], item: ChatItem): ChatItem[] {
  return [...items.filter((existing) => existing.id !== item.id), item];
}

/** Id of the streaming reply bubble for the patient message `sendId`. */
export const streamingId = (sendId: string) => `${sendId}-reply`;

/** Grows the streaming reply to `sendId`, creating its bubble on the first piece of text. */
export function appendText(items: readonly ChatItem[], { id, localDate }: SendVars, text: string): ChatItem[] {
  const replyId = streamingId(id);
  if (!items.some((item) => item.id === replyId)) {
    return [
      ...items,
      {
        id: replyId,
        role: 'assistant',
        content: text,
        inputMode: 'text',
        localDate,
        observations: [],
        status: 'streaming',
      },
    ];
  }
  return items.map((item) => (item.id === replyId ? { ...item, content: item.content + text } : item));
}

export function removeItem(items: readonly ChatItem[], id: string): ChatItem[] {
  return items.filter((item) => item.id !== id);
}

export function patchItem(items: readonly ChatItem[], id: string, patch: Partial<ChatItem>): ChatItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function chipText(observation: ChipObservation, labelFor: (code: string) => string): string {
  const label = observation.symptomCode ? labelFor(observation.symptomCode) : (observation.customLabel ?? '');
  const severity = observation.severity !== null ? severityLabel(observation.severity) : null;
  const duration =
    observation.durationDays !== null && observation.durationDays > 0
      ? `for ${observation.durationDays} ${observation.durationDays === 1 ? 'day' : 'days'}`
      : null;
  return [label, severity ?? duration ?? 'Mentioned'].join(' · ');
}

export function chipDotColor(severity: number | null): string {
  return severity !== null && isSeverity(severity) ? severityColors[severity] : UNRATED_DOT;
}

/** "today" only when every chip landed on the day the message was sent. */
export function addedTitle(item: Pick<ChatItem, 'localDate' | 'observations'>): string {
  const days = new Set(item.observations.map((observation) => observation.observedOn));
  if (days.size === 1 && days.has(item.localDate)) return 'I’ve added this to today:';
  if (days.size === 1) return `I’ve added this to ${formatLongDate([...days][0])}:`;
  return 'I’ve added this:';
}
