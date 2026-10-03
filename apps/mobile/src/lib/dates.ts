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
