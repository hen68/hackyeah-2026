import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { saveOnboarding, type CompleteAnswers, type SaveOnboardingDeps } from '@/features/onboarding/save-onboarding';
import { sendChatMessage } from '@/lib/api/chat';
import { replaceOnboardingAnswers } from '@/lib/api/onboarding';
import { saveMonitoringPlan } from '@/lib/api/plan';
import { updateProfile } from '@/lib/api/profile';
import { connectWearable } from '@/lib/api/wearables';

const LIVE_DEPS: SaveOnboardingDeps = {
  updateProfile,
  replaceOnboardingAnswers,
  saveMonitoringPlan,
  connectWearable,
  sendChatMessage,
};

/** Saves the answers once when the result screen opens; `retry` re-runs the (idempotent) save. */
export function useSaveOnboarding(patientId: string, answers: CompleteAnswers | null) {
  const mutation = useMutation({
    mutationFn: (complete: CompleteAnswers) => saveOnboarding(LIVE_DEPS, patientId, complete),
  });
  const { mutate } = mutation;
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!answers || hasStarted.current) return;
    hasStarted.current = true;
    mutate(answers);
  }, [answers, mutate]);

  return { ...mutation, retry: () => answers && mutate(answers) };
}
