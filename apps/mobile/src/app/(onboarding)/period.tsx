import { router } from 'expo-router';

import { PERIOD_OPTIONS } from '@/features/onboarding/answers';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { ChoiceQuestion } from '@/features/onboarding/onboarding-screen';

/** Artboard OnbPeriod (step 2). */
export default function PeriodScreen() {
  const { state, dispatch } = useOnboarding();
  return (
    <ChoiceQuestion
      step={2}
      title="When was your last period?"
      hint="This tells us which stage of menopause you may be in."
      options={PERIOD_OPTIONS}
      value={state.lastPeriod}
      onChange={(value) => dispatch({ type: 'setPeriod', value })}
      onContinue={() => router.push('/hrt')}
    />
  );
}
