import type { CalendarDay } from '@/lib/api/calendar';
import type { DayStatus } from '@/theme/tokens';

const DAYS_PER_WEEK = 7;

export type MonthRef = { year: number; month: number };

/** Monday-first weeks of a month (`month` is 1–12); `null` pads days outside the month. */
export function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const daysInMonth = new Date(year, month, 0).getDate();
  // getDay(): 0 = Sunday; shift so Monday = 0.
  const leading = (new Date(year, month - 1, 1).getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const trailing = (DAYS_PER_WEEK - (cells.length % DAYS_PER_WEEK)) % DAYS_PER_WEEK;
  const padded = [...cells, ...Array.from({ length: trailing }, () => null)];
  return Array.from({ length: padded.length / DAYS_PER_WEEK }, (_, week) =>
    padded.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK),
  );
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

const pad = (value: number) => String(value).padStart(2, '0');

/** YYYY-MM-DD for a day of the month. */
export function dateOf({ year, month }: MonthRef, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function monthName({ year, month }: MonthRef): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
}

export type MonthSummary = { logged: number; elapsed: number } & Record<Exclude<DayStatus, 'none'>, number>;

/** Counts for the "<Month> so far" tiles, over days up to and including `today`. */
export function summarizeMonth(days: readonly CalendarDay[], today: string): MonthSummary {
  const elapsed = days.filter((day) => day.day <= today);
  const count = (status: DayStatus) => elapsed.filter((day) => day.status === status).length;
  return {
    logged: elapsed.filter((day) => day.has_checkin).length,
    elapsed: elapsed.length,
    hard: count('hard'),
    okay: count('okay'),
    good: count('good'),
  };
}
