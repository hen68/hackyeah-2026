import { deviceTimeZone, toLocalDateString } from '@/lib/dates';

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
