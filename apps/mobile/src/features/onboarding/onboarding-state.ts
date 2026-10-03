import type { AgeBand, HrtStatus, LastPeriod, SymptomCode, WatchProvider } from '@/features/onboarding/answers';
import type { CompleteAnswers } from '@/features/onboarding/save-onboarding';

export type OnboardingState = {
  ageBand: AgeBand | null;
  lastPeriod: LastPeriod | null;
  hrtStatus: HrtStatus | null;
  symptoms: readonly SymptomCode[];
  freeText: string;
  watch: WatchProvider | null;
};

export type OnboardingAction =
  | { type: 'setAge'; value: AgeBand }
  | { type: 'setPeriod'; value: LastPeriod }
  | { type: 'setHrt'; value: HrtStatus }
  | { type: 'toggleSymptom'; code: SymptomCode }
  | { type: 'setFreeText'; value: string }
  | { type: 'toggleWatch'; provider: WatchProvider };

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  ageBand: null,
  lastPeriod: null,
  hrtStatus: null,
  symptoms: [],
  freeText: '',
  watch: null,
};

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'setAge':
      return { ...state, ageBand: action.value };
    case 'setPeriod':
      return { ...state, lastPeriod: action.value };
    case 'setHrt':
      return { ...state, hrtStatus: action.value };
    case 'toggleSymptom':
      return {
        ...state,
        symptoms: state.symptoms.includes(action.code)
          ? state.symptoms.filter((code) => code !== action.code)
          : [...state.symptoms, action.code],
      };
    case 'setFreeText':
      return { ...state, freeText: action.value };
    case 'toggleWatch':
      return { ...state, watch: state.watch === action.provider ? null : action.provider };
  }
}

/** `null` while a required question is unanswered (e.g. the app restarted mid-flow). */
export function toCompleteAnswers(state: OnboardingState): CompleteAnswers | null {
  const { ageBand, lastPeriod, hrtStatus } = state;
  if (!ageBand || !lastPeriod || !hrtStatus) return null;
  return { ...state, ageBand, lastPeriod, hrtStatus };
}
