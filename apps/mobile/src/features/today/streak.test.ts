import { addDays, currentStreak, daysInARow, lastWeek, monthGarden } from '@/features/today/streak';

describe('addDays', () => {
  test('crosses month and year boundaries', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  test('returns malformed input unchanged', () => {
    expect(addDays('nope', 1)).toBe('nope');
  });
});

describe('currentStreak', () => {
  const today = '2026-10-20';

  test('counts back from today when today is done', () => {
    expect(currentStreak(['2026-10-20', '2026-10-19', '2026-10-18'], today)).toEqual({ count: 3, isTodayDone: true });
  });

  test('keeps yesterday\'s streak alive while today is still open', () => {
    expect(currentStreak(['2026-10-19', '2026-10-18'], today)).toEqual({ count: 2, isTodayDone: false });
  });

  test('stops at the first missed day', () => {
    expect(currentStreak(['2026-10-20', '2026-10-18'], today)).toEqual({ count: 1, isTodayDone: true });
  });

  test('is zero when yesterday and today were both missed', () => {
    expect(currentStreak(['2026-10-17'], today)).toEqual({ count: 0, isTodayDone: false });
  });
});

describe('lastWeek', () => {
  test('returns seven days ending today with two-letter weekdays', () => {
    const week = lastWeek(['2026-10-20', '2026-10-15'], '2026-10-20');
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ day: '2026-10-14', weekday: 'We', isDone: false, isToday: false });
    expect(week[1].isDone).toBe(true);
    expect(week[6]).toEqual({ day: '2026-10-20', weekday: 'Tu', isDone: true, isToday: true });
  });
});

describe('monthGarden', () => {
  test('blooms only days of the same month', () => {
    const garden = monthGarden(['2026-10-01', '2026-10-31', '2026-09-30'], '2026-10-20');
    expect(garden.monthLabel).toBe('October');
    expect(garden.flowers).toHaveLength(31);
    expect(garden.bloomed).toBe(2);
    expect(garden.flowers[0]).toBe(true);
    expect(garden.flowers[30]).toBe(true);
  });
});

describe('daysInARow', () => {
  test('uses the singular for one day', () => {
    expect(daysInARow(1)).toBe('1 day in a row');
    expect(daysInARow(20)).toBe('20 days in a row');
  });
});
