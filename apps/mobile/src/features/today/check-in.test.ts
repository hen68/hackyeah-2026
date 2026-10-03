import {
  answeredSeverities,
  dayStatus,
  firstUnansweredIndex,
  greeting,
  isSeverity,
  minutesLeft,
  minutesSpent,
  questionFor,
  severityLabel,
  toPlanSymptoms,
} from '@/features/today/check-in';
import type { DayData } from '@/lib/api/day';

describe('dayStatus', () => {
  test('returns none when nothing was logged', () => {
    expect(dayStatus([])).toBe('none');
  });

  test.each([
    [[1, 2], 'good'],
    [[2, 3, 1], 'okay'],
    [[4], 'hard'],
    [[1, 5], 'hard'],
  ] as const)('maps max severity of %j to %s', (severities, status) => {
    expect(dayStatus(severities)).toBe(status);
  });
});

describe('firstUnansweredIndex', () => {
  const plan = ['hot_flushes', 'night_sweats', 'sleep'];

  test('opens the first question without an answer', () => {
    expect(firstUnansweredIndex(plan, { hot_flushes: 2 })).toBe(1);
  });

  test('opens the first question when everything is answered', () => {
    expect(firstUnansweredIndex(plan, { hot_flushes: 1, night_sweats: 3, sleep: 5 })).toBe(0);
  });
});

describe('time estimates', () => {
  test('minutesLeft rounds up and never drops below one', () => {
    expect(minutesLeft(0)).toBe(1);
    expect(minutesLeft(7)).toBe(2);
  });

  test('minutesSpent rounds to whole minutes, at least one', () => {
    expect(minutesSpent(0, 10_000)).toBe(1);
    expect(minutesSpent(0, 150_000)).toBe(3);
  });
});

describe('severityLabel', () => {
  test('returns the scale label for 1..5', () => {
    expect(severityLabel(1)).toBe('None');
    expect(severityLabel(5)).toBe('Severe');
  });

  test('returns null outside the scale', () => {
    expect(severityLabel(0)).toBeNull();
    expect(severityLabel(2.5)).toBeNull();
    expect(isSeverity(6)).toBe(false);
  });
});

describe('questionFor', () => {
  test('uses the artboard question for known symptoms', () => {
    expect(questionFor('sleep', 'Sleep trouble')).toBe('How badly did sleep bother you?');
  });

  test('falls back to a generic question', () => {
    expect(questionFor('headache', 'Headache')).toBe('How bad was headache today?');
  });
});

describe('greeting', () => {
  test('picks the part of the day and adds the name when present', () => {
    expect(greeting(8, 'Anna')).toBe('Good morning, Anna');
    expect(greeting(14, null)).toBe('Good afternoon');
    expect(greeting(20, '  ')).toBe('Good evening');
  });
});

describe('toPlanSymptoms', () => {
  const catalog = [
    { code: 'sleep', label: 'Sleep trouble', is_default: true, sort: 30 },
    { code: 'headache', label: 'Headache', is_default: false, sort: 120 },
    { code: 'hot_flushes', label: 'Hot flushes', is_default: true, sort: 10 },
  ];

  test('keeps plan symptoms in catalog order', () => {
    expect(toPlanSymptoms(catalog, ['headache', 'hot_flushes']).map((s) => s.code)).toEqual([
      'hot_flushes',
      'headache',
    ]);
  });

  test('falls back to defaults without a plan', () => {
    expect(toPlanSymptoms(catalog, null).map((s) => s.code)).toEqual(['hot_flushes', 'sleep']);
  });
});

describe('day entries', () => {
  const day: DayData = {
    day: '2026-10-20',
    checkin: null,
    entries: [
      { symptom_code: 'sleep', custom_label: null, severity: 2 },
      { symptom_code: null, custom_label: 'Cramps', severity: 3 },
    ],
    observations: [],
    chat_messages: [],
    wearable_nights: [],
  };

  test('answeredSeverities keys catalog entries by code', () => {
    expect(answeredSeverities(day)).toEqual({ sleep: 2 });
    expect(answeredSeverities(undefined)).toEqual({});
  });
});
