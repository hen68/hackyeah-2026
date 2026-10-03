import { parseDay } from '@/lib/api/day';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const RAW_DAY = {
  day: '2026-10-20',
  checkin: { id: 'c1', note: null },
  entries: [{ symptom_code: 'sleep', custom_label: null, severity: 4 }],
  observations: [],
  chat_messages: [],
  wearable_nights: [],
};

describe('parseDay', () => {
  test('accepts the get_day payload', () => {
    expect(parseDay(RAW_DAY).entries[0].severity).toBe(4);
  });

  test('accepts a day with no check-in', () => {
    expect(parseDay({ ...RAW_DAY, checkin: null, entries: [] }).checkin).toBeNull();
  });

  test('rejects severities outside 1..5', () => {
    const bad = { ...RAW_DAY, entries: [{ symptom_code: 'sleep', custom_label: null, severity: 9 }] };
    expect(() => parseDay(bad)).toThrow();
  });
});
