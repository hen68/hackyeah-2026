import type { DayData } from '@/lib/api/day';
import type { SymptomCatalogItem } from '@/lib/api/plan';
import { severityLabels, type DayStatus, type Severity } from '@/theme/tokens';

/** Day status thresholds (plan §0): max ≤2 good, 3 okay, ≥4 hard. */
const GOOD_MAX_SEVERITY = 2;
const OKAY_SEVERITY = 3;

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  good: 'Good day',
  okay: 'Okay day',
  hard: 'Hard day',
  none: 'Nothing logged',
};

/** Questions from the Today artboard; other symptoms fall back to `questionFor`. */
const SYMPTOM_QUESTIONS: Record<string, string> = {
  hot_flushes: 'How bad were your hot flushes today?',
  night_sweats: 'How much did you sweat at night?',
  sleep: 'How badly did sleep bother you?',
  mood: 'How much did your mood dip today?',
  energy: 'How low was your energy?',
  brain_fog: 'How foggy did you feel?',
  aches: 'How bad were your aches or stiff joints?',
  bleeding: 'How much bleeding did you have today?',
};

export function questionFor(code: string, label: string): string {
  return SYMPTOM_QUESTIONS[code] ?? `How bad was ${label.toLowerCase()} today?`;
}

export function isSeverity(value: number): value is Severity {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function severityLabel(value: number): string | null {
  return isSeverity(value) ? severityLabels[value] : null;
}

export function dayStatus(severities: readonly number[]): DayStatus {
  if (severities.length === 0) return 'none';
  const max = Math.max(...severities);
  if (max <= GOOD_MAX_SEVERITY) return 'good';
  if (max === OKAY_SEVERITY) return 'okay';
  return 'hard';
}

/** First plan symptom without an answer, ignoring `skipCode` (the one just answered). */
export function nextUnanswered(
  planCodes: readonly string[],
  answered: Readonly<Record<string, number>>,
  skipCode: string | null = null,
): string | null {
  return planCodes.find((code) => code !== skipCode && answered[code] === undefined) ?? null;
}

const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 18;

export function greeting(hour: number, name: string | null): string {
  const part = hour < MORNING_END_HOUR ? 'morning' : hour < AFTERNOON_END_HOUR ? 'afternoon' : 'evening';
  const trimmed = name?.trim();
  return trimmed ? `Good ${part}, ${trimmed}` : `Good ${part}`;
}

export type PlanSymptom = { code: string; label: string };

/** Plan symptoms in catalog order; without a plan, the catalog defaults. */
export function toPlanSymptoms(
  catalog: readonly SymptomCatalogItem[],
  planCodes: readonly string[] | null,
): PlanSymptom[] {
  const inPlan = (item: SymptomCatalogItem) => (planCodes ? planCodes.includes(item.code) : item.is_default);
  return [...catalog]
    .sort((a, b) => a.sort - b.sort)
    .filter(inPlan)
    .map(({ code, label }) => ({ code, label }));
}

/** Catalog-coded severities of a day, keyed by symptom code. */
export function answeredSeverities(day: DayData | undefined): Record<string, number> {
  return Object.fromEntries(
    (day?.entries ?? []).flatMap((entry) => (entry.symptom_code ? [[entry.symptom_code, entry.severity]] : [])),
  );
}

/** Optimistic copy of a day with one symptom (re)rated. */
export function withEntry(day: DayData, symptomCode: string, severity: Severity): DayData {
  const others = day.entries.filter((entry) => entry.symptom_code !== symptomCode);
  return { ...day, entries: [...others, { symptom_code: symptomCode, custom_label: null, severity }] };
}
