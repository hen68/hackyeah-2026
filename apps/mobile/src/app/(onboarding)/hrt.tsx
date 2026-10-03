import { router } from 'expo-router';

import { HRT_OPTIONS } from '@/features/onboarding/answers';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { ChoiceQuestion } from '@/features/onboarding/onboarding-screen';

/** Artboard OnbHRT (step 3). */
export default function HrtScreen() {
  const { state, dispatch } = useOnboarding();
  return (
    <ChoiceQuestion
      step={3}
      title="Are you taking hormone therapy?"
      hint="For example HRT tablets, patches or gel. Your doctor will see this in your report."
      options={HRT_OPTIONS}
      value={state.hrtStatus}
      onChange={(value) => dispatch({ type: 'setHrt', value })}
      onContinue={() => router.push('/symptoms')}
    />
  );
}
