import type { AgeBand, HrtStatus, LastPeriod, SymptomCode, WatchProvider } from '@/features/onboarding/answers';
import { buildPlanCodes } from '@/features/onboarding/answers';
import { inferStage, type MenopauseStage } from '@/features/onboarding/stage';
import type { SendChatInput } from '@/lib/api/chat';
import type { OnboardingAnswer } from '@/lib/api/onboarding';
import type { ProfilePatch } from '@/lib/api/profile';
import { deviceTimeZone, toLocalDateString } from '@/lib/dates';

export type CompleteAnswers = {
  ageBand: AgeBand;
  lastPeriod: LastPeriod;
  hrtStatus: HrtStatus;
  symptoms: readonly SymptomCode[];
  freeText: string;
  watch: WatchProvider | null;
};

/** The `src/lib/api` functions this needs, injected so the order of writes is testable. */
export type SaveOnboardingDeps = {
  updateProfile: (userId: string, patch: ProfilePatch) => Promise<unknown>;
  replaceOnboardingAnswers: (patientId: string, answers: readonly OnboardingAnswer[]) => Promise<void>;
  saveMonitoringPlan: (patientId: string, symptomCodes: readonly string[]) => Promise<unknown>;
  connectWearable: (patientId: string, provider: string) => Promise<void>;
  sendChatMessage: (input: SendChatInput) => Promise<unknown>;
};

/** What happened to the free-text note: nothing to send, sent, or the chat function failed. */
export type NoteStatus = 'none' | 'sent' | 'failed';

export type SaveOnboardingResult = { stage: MenopauseStage; note: NoteStatus };

function toAnswerRows(answers: CompleteAnswers): OnboardingAnswer[] {
  return [
    { question: 'age_band', answer: answers.ageBand },
    { question: 'last_period', answer: answers.lastPeriod },
    { question: 'hrt_status', answer: answers.hrtStatus },
    ...answers.symptoms.map((code): OnboardingAnswer => ({ question: 'symptoms', answer: code })),
  ];
}

/**
 * Persists onboarding (plan Step 6, task 5). Every write is idempotent, so a failed run can be retried.
 * The free text goes last and never fails the flow: chat is best-effort and runs only after the rest saved.
 */
export async function saveOnboarding(
  deps: SaveOnboardingDeps,
  patientId: string,
  answers: CompleteAnswers,
  now: Date = new Date(),
): Promise<SaveOnboardingResult> {
  const stage = inferStage(answers);

  await deps.updateProfile(patientId, {
    age_band: answers.ageBand,
    last_period: answers.lastPeriod,
    hrt_status: answers.hrtStatus,
    timezone: deviceTimeZone(),
  });
  await deps.replaceOnboardingAnswers(patientId, toAnswerRows(answers));
  await deps.saveMonitoringPlan(patientId, buildPlanCodes(answers.symptoms));
  if (answers.watch) await deps.connectWearable(patientId, answers.watch);

  const message = answers.freeText.trim();
  if (!message) return { stage, note: 'none' };
  try {
    await deps.sendChatMessage({ message, inputMode: 'text', localDate: toLocalDateString(now) });
    return { stage, note: 'sent' };
  } catch {
    // Surfaced to the patient on the result screen; the chat function may not be deployed yet.
    return { stage, note: 'failed' };
  }
}
