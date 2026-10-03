import { REVEAL_MAX_MS, REVEAL_MS_PER_CHAR, revealSteps } from '@/features/chat/reveal';

const total = (steps: { delayMs: number }[]) => steps.reduce((sum, step) => sum + step.delayMs, 0);

describe('revealSteps', () => {
  test('types the held-back tail word by word after the shown text', () => {
    const steps = revealSteps('That sounds ', 'That sounds hard. How long?', false)!;

    expect(steps.map((step) => step.content)).toEqual([
      'That sounds hard. ',
      'That sounds hard. How ',
      'That sounds hard. How long?',
    ]);
    expect(steps[0].delayMs).toBe('hard. '.length * REVEAL_MS_PER_CHAR);
    expect(total(steps)).toBe('hard. How long?'.length * REVEAL_MS_PER_CHAR);
  });

  test('types a reply with no deltas from empty', () => {
    const steps = revealSteps('', 'Noted.', false)!;

    expect(steps).toEqual([{ content: 'Noted.', delayMs: 6 * REVEAL_MS_PER_CHAR }]);
  });

  test('speeds up so a long tail never takes longer than the cap', () => {
    const final = 'word '.repeat(200).trim();
    const steps = revealSteps('', final, false)!;

    expect(steps).toHaveLength(200);
    expect(steps[steps.length - 1].content).toBe(final);
    expect(total(steps)).toBeCloseTo(REVEAL_MAX_MS);
  });

  test('swaps at once when the reply was replaced or no longer starts with the shown text', () => {
    expect(revealSteps('That sounds ', 'A safe fallback.', true)).toBeNull();
    expect(revealSteps('That sounds ', 'Something else entirely.', false)).toBeNull();
  });

  test('has nothing to type when everything is already shown', () => {
    expect(revealSteps('All here.', 'All here.', false)).toEqual([]);
  });
});
