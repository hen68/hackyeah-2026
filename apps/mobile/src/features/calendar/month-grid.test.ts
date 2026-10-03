import { buildMonthGrid, dateOf, shiftMonth, summarizeMonth } from '@/features/calendar/month-grid';
import type { CalendarDay } from '@/lib/api/calendar';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('buildMonthGrid', () => {
  test('pads October 2026 (starts Thursday) with three leading blanks', () => {
    const weeks = buildMonthGrid(2026, 10);
    expect(weeks[0]).toEqual([null, null, null, 1, 2, 3, 4]);
    expect(weeks.at(-1)).toEqual([26, 27, 28, 29, 30, 31, null]);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  test('handles February in a leap year', () => {
    const days = buildMonthGrid(2028, 2)
      .flat()
      .filter((day) => day !== null);
    expect(days).toHaveLength(29);
    expect(buildMonthGrid(2028, 2)[0]).toEqual([null, 1, 2, 3, 4, 5, 6]);
  });

  test('needs no blanks when the month starts on Monday', () => {
    expect(buildMonthGrid(2026, 6)[0][0]).toBe(1);
  });
});

describe('month helpers', () => {
  test('shiftMonth crosses year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  test('dateOf zero-pads', () => {
    expect(dateOf({ year: 2026, month: 3 }, 5)).toBe('2026-03-05');
  });
});

describe('summarizeMonth', () => {
  const row = (day: string, status: string, hasCheckin = true): CalendarDay => ({
    day,
    status: status as CalendarDay['status'],
    has_bleeding: false,
    has_checkin: hasCheckin,
  });

  test('counts statuses up to today only', () => {
    const days = [
      row('2026-10-01', 'hard'),
      row('2026-10-02', 'okay'),
      row('2026-10-03', 'none', false),
      row('2026-10-04', 'good'),
    ];
    expect(summarizeMonth(days, '2026-10-03')).toEqual({ logged: 2, elapsed: 3, hard: 1, okay: 1, good: 0 });
  });
});
