import { formatSleep, formatWarmAt, watchHint, watchRows, watchSummary } from '@/features/today/watch';
import type { DayWearableNight } from '@/lib/api/day';

const NIGHT: DayWearableNight = {
  provider: 'apple_health',
  sleep_minutes: 310,
  awakenings: 3,
  resting_hr: 64,
  skin_temp_delta_c: 0.4,
  warm_at: '03:00:00',
};
const EMPTY_NIGHT: DayWearableNight = {
  ...NIGHT,
  sleep_minutes: null,
  awakenings: null,
  resting_hr: null,
  warm_at: null,
};

describe('formatters', () => {
  test('formatSleep splits minutes into hours and minutes', () => {
    expect(formatSleep(310)).toBe('5 h 10 min');
  });

  test.each([
    ['03:00:00', '3 am'],
    ['00:30:00', '12 am'],
    ['12:00:00', '12 pm'],
    ['23:10:00', '11 pm'],
  ])('formatWarmAt(%s) is %s', (time, expected) => {
    expect(formatWarmAt(time)).toBe(expected);
  });
});

describe('watchSummary', () => {
  test('joins the available facts like the artboard', () => {
    expect(watchSummary(NIGHT)).toBe('5 h 10 sleep · woke 3 times · warm at 3 am');
  });

  test('returns null when the night has no data', () => {
    expect(watchSummary(EMPTY_NIGHT)).toBeNull();
  });
});

describe('watchRows', () => {
  test('lists every available metric', () => {
    expect(watchRows(NIGHT)).toEqual([
      { label: 'Sleep', value: '5 h 10 min' },
      { label: 'Woke up', value: '3 times' },
      { label: 'Body temperature', value: 'Warmer at 3 am' },
      { label: 'Resting heart rate', value: '64 per minute' },
    ]);
    expect(watchRows(EMPTY_NIGHT)).toEqual([]);
  });
});

describe('watchHint', () => {
  test('hints night sweats and sleep only when the watch saw it', () => {
    expect(watchHint('night_sweats', NIGHT)).toContain('around 3 am');
    expect(watchHint('sleep', NIGHT)).toBe('Your watch: you slept 5 h 10 min and woke up 3 times.');
    expect(watchHint('mood', NIGHT)).toBeNull();
    expect(watchHint('sleep', EMPTY_NIGHT)).toBeNull();
    expect(watchHint('sleep', null)).toBeNull();
  });
});
