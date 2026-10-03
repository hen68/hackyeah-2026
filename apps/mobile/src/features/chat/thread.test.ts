import {
  addedTitle,
  appendText,
  assistantItem,
  chipDotColor,
  chipText,
  fromHistory,
  patchItem,
  removeItem,
  streamingId,
  upsertLast,
  userItem,
  type ChipObservation,
} from '@/features/chat/thread';
import type { ChatHistoryRow } from '@/lib/api/chat';
import { severityColors } from '@/theme/tokens';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const DAY = '2026-10-03';

function row(
  id: string,
  role: 'user' | 'assistant',
  observations: ChatHistoryRow['observations'] = [],
): ChatHistoryRow {
  return { id, role, content: id, input_mode: 'text', local_date: DAY, created_at: '', observations };
}

const HOT_FLUSHES = {
  id: 'o1',
  symptom_code: 'hot_flushes',
  custom_label: null,
  severity: 4,
  duration_days: null,
  observed_on: DAY,
};

const labelFor = (code: string) => ({ hot_flushes: 'Hot flushes', tiredness: 'Tiredness' })[code] ?? code;

function chip(overrides: Partial<ChipObservation>): ChipObservation {
  return {
    key: 'k',
    symptomCode: 'tiredness',
    customLabel: null,
    severity: null,
    durationDays: null,
    observedOn: DAY,
    ...overrides,
  };
}

describe('fromHistory', () => {
  test('orders oldest first', () => {
    const items = fromHistory([row('a2', 'assistant'), row('u1', 'user')]);

    expect(items.map((item) => item.id)).toEqual(['u1', 'a2']);
  });

  test('moves observations linked to the patient message onto the next reply', () => {
    const items = fromHistory([row('a2', 'assistant'), row('u1', 'user', [HOT_FLUSHES])]);

    expect(items[0].observations).toEqual([]);
    expect(items[1].observations.map((o) => o.symptomCode)).toEqual(['hot_flushes']);
  });

  test('keeps observations linked to the reply itself', () => {
    const items = fromHistory([row('a2', 'assistant', [HOT_FLUSHES]), row('u1', 'user')]);

    expect(items[1].observations.map((o) => o.key)).toEqual(['o1']);
  });
});

describe('send helpers', () => {
  const vars = { id: 'local-1', message: 'tired', localDate: DAY };

  test('userItem is a sending text bubble', () => {
    expect(userItem(vars)).toMatchObject({ role: 'user', content: 'tired', status: 'sending', observations: [] });
  });

  test('userItem defaults to text and keeps a dictated message as voice', () => {
    expect(userItem(vars).inputMode).toBe('text');
    expect(userItem({ ...vars, inputMode: 'voice' }).inputMode).toBe('voice');
  });

  test('assistantItem maps the response and defaults observed_on to the message day', () => {
    const item = assistantItem(
      { reply: 'Noted.', message_id: 'm1', observations: [{ symptom_code: 'tiredness', severity: 3 }] },
      DAY,
    );

    expect(item).toMatchObject({ id: 'm1', role: 'assistant', content: 'Noted.', status: 'sent' });
    expect(item.observations).toEqual([chip({ key: 'm1-0', symptomCode: 'tiredness', severity: 3 })]);
  });

  test('upsertLast moves a retried message to the end', () => {
    const first = userItem(vars);
    const second = userItem({ ...vars, id: 'local-2' });

    expect(upsertLast([first, second], first).map((item) => item.id)).toEqual(['local-2', 'local-1']);
  });

  test('patchItem changes only the matching item', () => {
    const items = patchItem([userItem(vars), userItem({ ...vars, id: 'x' })], 'x', { status: 'failed', error: 'e' });

    expect(items.map((item) => item.status)).toEqual(['sending', 'failed']);
  });

  test('appendText creates the streaming reply on the first delta and grows it without mutating', () => {
    const start = [userItem(vars)];
    const first = appendText(start, vars, 'That ');
    const second = appendText(first, vars, 'sounds hard.');

    expect(start).toHaveLength(1);
    expect(first[1]).toMatchObject({
      id: streamingId('local-1'),
      role: 'assistant',
      content: 'That ',
      status: 'streaming',
    });
    expect(second[1].content).toBe('That sounds hard.');
    expect(first[1].content).toBe('That ');
    expect(second).toHaveLength(2);
  });

  test('removeItem drops only the matching item', () => {
    const items = appendText([userItem(vars)], vars, 'Hi');

    expect(removeItem(items, streamingId('local-1'))).toEqual([userItem(vars)]);
  });
});

describe('chipText', () => {
  test('uses the severity label', () => {
    expect(chipText(chip({ symptomCode: 'hot_flushes', severity: 4 }), labelFor)).toBe('Hot flushes · Strong');
  });

  test('falls back to duration, then "Mentioned"', () => {
    expect(chipText(chip({ durationDays: 1 }), labelFor)).toBe('Tiredness · for 1 day');
    expect(chipText(chip({ durationDays: 3 }), labelFor)).toBe('Tiredness · for 3 days');
    expect(chipText(chip({}), labelFor)).toBe('Tiredness · Mentioned');
  });

  test('uses the custom label when there is no catalog code', () => {
    expect(chipText(chip({ symptomCode: null, customLabel: 'Headache' }), labelFor)).toBe('Headache · Mentioned');
  });
});

describe('chipDotColor', () => {
  test('uses the severity colour, grey when unrated', () => {
    expect(chipDotColor(5)).toBe(severityColors[5]);
    expect(chipDotColor(null)).not.toBe(severityColors[5]);
  });
});

describe('addedTitle', () => {
  test('says today only when every chip is on the message day', () => {
    expect(addedTitle({ localDate: DAY, observations: [chip({})] })).toBe('I’ve added this to today:');
  });

  test('names a single other day', () => {
    expect(addedTitle({ localDate: DAY, observations: [chip({ observedOn: '2026-10-02' })] })).toBe(
      'I’ve added this to Friday, 2 October:',
    );
  });

  test('stays generic across several days', () => {
    expect(addedTitle({ localDate: DAY, observations: [chip({}), chip({ observedOn: '2026-10-02' })] })).toBe(
      'I’ve added this:',
    );
  });
});
