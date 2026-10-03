import { parseLocalDate, toLocalDateString } from '@/lib/dates';

const WEEK_LENGTH = 7;

/** `day` shifted by `delta` calendar days (YYYY-MM-DD in, YYYY-MM-DD out). */
export function addDays(day: string, delta: number): string {
  const date = parseLocalDate(day);
  if (!date) return day;
  return toLocalDateString(new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta));
}

export type Streak = { count: number; isTodayDone: boolean };

/**
 * Consecutive check-in days ending today, or ending yesterday while today is still open,
 * so an unfinished morning doesn't reset the streak.
 */
export function currentStreak(checkinDays: readonly string[], today: string): Streak {
  const done = new Set(checkinDays);
  const isTodayDone = done.has(today);
  let cursor = isTodayDone ? today : addDays(today, -1);
  let count = 0;
  while (done.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return { count, isTodayDone };
}

export type WeekDay = { day: string; weekday: string; isDone: boolean; isToday: boolean };

/** The last seven days ending today, oldest first, for the streak strip. */
export function lastWeek(checkinDays: readonly string[], today: string): WeekDay[] {
  const done = new Set(checkinDays);
  return Array.from({ length: WEEK_LENGTH }, (_, index) => {
    const day = addDays(today, index - (WEEK_LENGTH - 1));
    const date = parseLocalDate(day);
    const weekday = date ? date.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2) : '';
    return { day, weekday, isDone: done.has(day), isToday: day === today };
  });
}

export type Garden = { monthLabel: string; flowers: boolean[]; bloomed: number };

/** One slot per day of `day`'s month; a slot blooms when that day has a check-in. */
export function monthGarden(checkinDays: readonly string[], day: string): Garden {
  const date = parseLocalDate(day) ?? new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const done = new Set(checkinDays);
  const flowers = Array.from({ length: daysInMonth }, (_, index) =>
    done.has(toLocalDateString(new Date(year, month, index + 1))),
  );
  return {
    monthLabel: date.toLocaleDateString('en-GB', { month: 'long' }),
    flowers,
    bloomed: flowers.filter(Boolean).length,
  };
}

export function daysInARow(count: number): string {
  return `${count} ${count === 1 ? 'day' : 'days'} in a row`;
}
