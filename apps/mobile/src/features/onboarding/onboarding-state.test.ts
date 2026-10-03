import { INITIAL_ONBOARDING_STATE, onboardingReducer, toCompleteAnswers } from '@/features/onboarding/onboarding-state';

describe('onboardingReducer', () => {
  test('toggles symptoms on and off without mutating the previous state', () => {
    const once = onboardingReducer(INITIAL_ONBOARDING_STATE, { type: 'toggleSymptom', code: 'sleep' });
    const twice = onboardingReducer(once, { type: 'toggleSymptom', code: 'sleep' });

    expect(once.symptoms).toEqual(['sleep']);
    expect(twice.symptoms).toEqual([]);
    expect(INITIAL_ONBOARDING_STATE.symptoms).toEqual([]);
  });

  test('picking the connected watch again disconnects it', () => {
    const on = onboardingReducer(INITIAL_ONBOARDING_STATE, { type: 'toggleWatch', provider: 'fitbit' });
    const switched = onboardingReducer(on, { type: 'toggleWatch', provider: 'garmin' });
    const off = onboardingReducer(switched, { type: 'toggleWatch', provider: 'garmin' });

    expect(on.watch).toBe('fitbit');
    expect(switched.watch).toBe('garmin');
    expect(off.watch).toBeNull();
  });
});

describe('toCompleteAnswers', () => {
  test('is null until age, period and HRT are answered', () => {
    const partial = onboardingReducer(INITIAL_ONBOARDING_STATE, { type: 'setAge', value: '50_54' });

    expect(toCompleteAnswers(partial)).toBeNull();
  });

  test('returns the answers once the required questions are answered', () => {
    const state = [
      { type: 'setAge', value: '50_54' },
      { type: 'setPeriod', value: 'lt_3m' },
      { type: 'setHrt', value: 'unsure' },
      { type: 'setFreeText', value: 'tired' },
    ] as const;

    const answers = toCompleteAnswers(state.reduce(onboardingReducer, INITIAL_ONBOARDING_STATE));

    expect(answers).toEqual({
      ageBand: '50_54',
      lastPeriod: 'lt_3m',
      hrtStatus: 'unsure',
      symptoms: [],
      freeText: 'tired',
      watch: null,
    });
  });
});
