import { isSeverity, severityLabel } from '@/features/today/check-in';
import type { ChatHistoryRow, ChatResponse } from '@/lib/api/chat';
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
  status: 'sent' | 'sending' | 'failed';
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

export type SendVars = { id: string; message: string; localDate: string };

export function userItem({ id, message, localDate }: SendVars): ChatItem {
  return { id, role: 'user', content: message, inputMode: 'text', localDate, observations: [], status: 'sending' };
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
