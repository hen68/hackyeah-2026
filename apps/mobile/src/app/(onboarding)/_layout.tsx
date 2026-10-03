import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/features/onboarding/onboarding-context';

export const unstable_settings = { initialRouteName: 'age' };

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* No swipe-back from the result: the answers are already saved. */}
        <Stack.Screen name="result" options={{ gestureEnabled: false }} />
      </Stack>
    </OnboardingProvider>
  );
}
