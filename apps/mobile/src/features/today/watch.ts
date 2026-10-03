import type { DayWearableNight } from '@/lib/api/day';

const MINUTES_PER_HOUR = 60;
const NOON_HOUR = 12;

export function formatSleep(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return `${hours} h ${rest} min`;
}

/** `03:00:00` → `3 am` (wearable_nights.warm_at is a time without zone). */
export function formatWarmAt(time: string): string {
  const hour = Number(time.split(':')[0]);
  const suffix = hour < NOON_HOUR ? 'am' : 'pm';
  const clock = hour % NOON_HOUR === 0 ? NOON_HOUR : hour % NOON_HOUR;
  return `${clock} ${suffix}`;
}

function times(count: number): string {
  return count === 1 ? '1 time' : `${count} times`;
}

/** One-line summary for the Today watch row, or null when the night has no usable data. */
export function watchSummary(night: DayWearableNight): string | null {
  const parts = [
    night.sleep_minutes !== null ? `${formatSleep(night.sleep_minutes).replace(' min', '')} sleep` : null,
    night.awakenings !== null ? `woke ${times(night.awakenings)}` : null,
    night.warm_at !== null ? `warm at ${formatWarmAt(night.warm_at)}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export type WatchRow = { label: string; value: string };

/** Rows for the Day detail "From your watch" card. */
export function watchRows(night: DayWearableNight): WatchRow[] {
  const rows: (WatchRow | null)[] = [
    night.sleep_minutes !== null ? { label: 'Sleep', value: formatSleep(night.sleep_minutes) } : null,
    night.awakenings !== null ? { label: 'Woke up', value: times(night.awakenings) } : null,
    night.warm_at !== null ? { label: 'Body temperature', value: `Warmer at ${formatWarmAt(night.warm_at)}` } : null,
    night.resting_hr !== null ? { label: 'Resting heart rate', value: `${night.resting_hr} per minute` } : null,
  ];
  return rows.filter((row): row is WatchRow => row !== null);
}

/** Severity hint shown under a question, only when the watch saw something relevant. */
export function watchHint(code: string, night: DayWearableNight | null): string | null {
  if (!night) return null;
  if (code === 'night_sweats' && night.warm_at !== null) {
    return `Your watch: you got warmer around ${formatWarmAt(night.warm_at)}, which often means a night sweat.`;
  }
  if (code === 'sleep' && night.sleep_minutes !== null && night.awakenings !== null) {
    return `Your watch: you slept ${formatSleep(night.sleep_minutes)} and woke up ${times(night.awakenings)}.`;
  }
  return null;
}
