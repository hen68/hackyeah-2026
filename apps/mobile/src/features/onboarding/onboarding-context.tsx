import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

import {
  INITIAL_ONBOARDING_STATE,
  onboardingReducer,
  type OnboardingAction,
  type OnboardingState,
} from '@/features/onboarding/onboarding-state';

type OnboardingContextValue = { state: OnboardingState; dispatch: Dispatch<OnboardingAction> };

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/** Holds answers in memory until the result screen saves them. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(onboardingReducer, INITIAL_ONBOARDING_STATE);
  return <OnboardingContext.Provider value={{ state, dispatch }}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return value;
}
