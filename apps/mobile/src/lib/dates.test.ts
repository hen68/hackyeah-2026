import { deviceTimeZone, formatClockTime, formatLongDate, parseLocalDate, toLocalDateString } from '@/lib/dates';

describe('toLocalDateString', () => {
  test('formats the local calendar date as YYYY-MM-DD with zero padding', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('deviceTimeZone', () => {
  test('returns an IANA zone name', () => {
    expect(deviceTimeZone()).toMatch(/^[A-Za-z_]+(\/[A-Za-z_+-]+)*$|^UTC$/);
  });
});

describe('parseLocalDate', () => {
  test('parses a valid local date', () => {
    expect(parseLocalDate('2026-10-20')).toEqual(new Date(2026, 9, 20));
  });

  test.each(['2026-02-30', '2026-1-05', 'today', ''])('rejects %j', (day) => {
    expect(parseLocalDate(day)).toBeNull();
  });
});

describe('formatLongDate', () => {
  test('formats weekday, day and month', () => {
    expect(formatLongDate('2026-10-20')).toBe('Tuesday, 20 October');
  });

  test('returns malformed input unchanged', () => {
    expect(formatLongDate('nope')).toBe('nope');
  });
});

describe('formatClockTime', () => {
  test('formats local time with a lowercase suffix', () => {
    expect(formatClockTime(new Date(2026, 9, 20, 9, 14).toISOString())).toBe('9:14 am');
  });
});
