import { router } from 'expo-router';

import { AGE_OPTIONS } from '@/features/onboarding/answers';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { ChoiceQuestion } from '@/features/onboarding/onboarding-screen';

/** Artboard OnbAge (step 1). */
export default function AgeScreen() {
  const { state, dispatch } = useOnboarding();
  return (
    <ChoiceQuestion
      step={1}
      title="How old are you?"
      hint="Menopause usually begins between 45 and 55. Your age helps me understand your answers."
      options={AGE_OPTIONS}
      value={state.ageBand}
      onChange={(value) => dispatch({ type: 'setAge', value })}
      onContinue={() => router.push('/period')}
    />
  );
}
