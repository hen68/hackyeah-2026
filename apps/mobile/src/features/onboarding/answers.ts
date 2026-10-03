/**
 * Onboarding answer values. Each `value` matches a CHECK constraint on `profiles`,
 * `onboarding_answers`, `wearable_connections`, or a `symptom_catalog.code`.
 */
type Option<T extends string> = { readonly value: T; readonly label: string };

export const AGE_OPTIONS = [
  { value: '40_44', label: '40 to 44' },
  { value: '45_49', label: '45 to 49' },
  { value: '50_54', label: '50 to 54' },
  { value: '55_59', label: '55 to 59' },
  { value: '60_plus', label: '60 or older' },
] as const satisfies readonly Option<string>[];
export type AgeBand = (typeof AGE_OPTIONS)[number]['value'];

export const PERIOD_OPTIONS = [
  { value: 'lt_3m', label: 'Less than 3 months ago' },
  { value: '3_12m', label: '3 to 12 months ago' },
  { value: 'gt_12m', label: 'More than a year ago' },
  { value: 'unsure', label: 'I’m not sure, or I had surgery' },
] as const satisfies readonly Option<string>[];
export type LastPeriod = (typeof PERIOD_OPTIONS)[number]['value'];

export const HRT_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'I’m not sure' },
] as const satisfies readonly Option<string>[];
export type HrtStatus = (typeof HRT_OPTIONS)[number]['value'];

/** OnbSymptoms tiles in canvas order, mapped to catalog codes ("Joint pain" → `aches`). */
export const SYMPTOM_OPTIONS = [
  { value: 'hot_flushes', label: 'Hot flushes' },
  { value: 'night_sweats', label: 'Night sweats' },
  { value: 'sleep', label: 'Poor sleep' },
  { value: 'mood', label: 'Mood swings' },
  { value: 'brain_fog', label: 'Brain fog' },
  { value: 'aches', label: 'Joint pain' },
  { value: 'tiredness', label: 'Tiredness' },
  { value: 'vaginal_dryness', label: 'Vaginal dryness' },
] as const satisfies readonly Option<string>[];
export type SymptomCode = (typeof SYMPTOM_OPTIONS)[number]['value'];

/** `symptom_catalog` rows with `is_default = true`, in `sort` order. */
export const DEFAULT_PLAN_CODES = [
  'hot_flushes',
  'night_sweats',
  'sleep',
  'mood',
  'energy',
  'brain_fog',
  'aches',
  'bleeding',
] as const;

export const WATCH_OPTIONS = [
  { value: 'apple_health', label: 'Apple Health' },
  { value: 'health_connect', label: 'Google Health Connect' },
  { value: 'garmin', label: 'Garmin' },
  { value: 'fitbit', label: 'Fitbit' },
] as const satisfies readonly Option<string>[];
export type WatchProvider = (typeof WATCH_OPTIONS)[number]['value'];

/** The plan is the defaults plus anything extra the patient picked, without duplicates. */
export function buildPlanCodes(selected: readonly SymptomCode[]): string[] {
  return [...new Set<string>([...DEFAULT_PLAN_CODES, ...selected])];
}
