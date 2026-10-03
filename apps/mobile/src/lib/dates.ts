const FALLBACK_TIME_ZONE = 'UTC';

/** Patient-local calendar date (plan §0 "Local day"), formatted YYYY-MM-DD. */
export function toLocalDateString(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** IANA zone of the device, stored in `profiles.timezone`. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
}

/** Parses a YYYY-MM-DD string as a local calendar date; null when malformed. */
export function parseLocalDate(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toLocalDateString(date) === day ? date : null;
}

/** `2026-10-20` → `Tuesday, 20 October`. */
export function formatLongDate(day: string): string {
  const date = parseLocalDate(day);
  if (!date) return day;
  // Assembled by hand: ICU builds differ on the comma after the weekday.
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  return `${weekday}, ${date.getDate()} ${month}`;
}

/** ISO timestamp → device-local clock time, e.g. `9:14 am`. */
export function formatClockTime(timestamp: string): string {
  return new Date(timestamp)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .replace(' AM', ' am')
    .replace(' PM', ' pm');
}
