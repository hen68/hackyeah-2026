import { DEFAULT_PLAN_CODES } from '@/features/onboarding/answers';
import { saveOnboarding, type CompleteAnswers, type SaveOnboardingDeps } from '@/features/onboarding/save-onboarding';

const PATIENT_ID = 'patient-1';
const NOW = new Date(2026, 9, 3, 21, 30);

const BASE_ANSWERS: CompleteAnswers = {
  ageBand: '55_59',
  lastPeriod: 'gt_12m',
  hrtStatus: 'no',
  symptoms: ['night_sweats', 'tiredness'],
  freeText: '',
  watch: null,
};

function createDeps(): jest.Mocked<SaveOnboardingDeps> {
  return {
    updateProfile: jest.fn().mockResolvedValue({}),
    replaceOnboardingAnswers: jest.fn().mockResolvedValue(undefined),
    saveMonitoringPlan: jest.fn().mockResolvedValue({}),
    connectWearable: jest.fn().mockResolvedValue(undefined),
    sendChatMessage: jest.fn().mockResolvedValue({ reply: '', observations: [], message_id: 'm1' }),
  };
}

describe('saveOnboarding', () => {
  test('writes the profile, answers and plan, and returns the inferred stage', async () => {
    const deps = createDeps();

    const result = await saveOnboarding(deps, PATIENT_ID, BASE_ANSWERS, NOW);

    expect(result).toEqual({ stage: 'postmenopause', note: 'none' });
    expect(deps.updateProfile).toHaveBeenCalledWith(PATIENT_ID, {
      age_band: '55_59',
      last_period: 'gt_12m',
      hrt_status: 'no',
      menopause_stage: 'postmenopause',
      timezone: expect.any(String),
    });
    expect(deps.replaceOnboardingAnswers).toHaveBeenCalledWith(PATIENT_ID, [
      { question: 'age_band', answer: '55_59' },
      { question: 'last_period', answer: 'gt_12m' },
      { question: 'hrt_status', answer: 'no' },
      { question: 'symptoms', answer: 'night_sweats' },
      { question: 'symptoms', answer: 'tiredness' },
    ]);
    expect(deps.saveMonitoringPlan).toHaveBeenCalledWith(PATIENT_ID, [...DEFAULT_PLAN_CODES, 'tiredness']);
    expect(deps.connectWearable).not.toHaveBeenCalled();
    expect(deps.sendChatMessage).not.toHaveBeenCalled();
  });

  test('connects the chosen watch', async () => {
    const deps = createDeps();

    await saveOnboarding(deps, PATIENT_ID, { ...BASE_ANSWERS, watch: 'garmin' }, NOW);

    expect(deps.connectWearable).toHaveBeenCalledWith(PATIENT_ID, 'garmin');
  });

  test('sends trimmed free text to chat with the local date', async () => {
    const deps = createDeps();

    const result = await saveOnboarding(deps, PATIENT_ID, { ...BASE_ANSWERS, freeText: '  I wake up soaked  ' }, NOW);

    expect(deps.sendChatMessage).toHaveBeenCalledWith({
      message: 'I wake up soaked',
      inputMode: 'text',
      localDate: '2026-10-03',
    });
    expect(result.note).toBe('sent');
  });

  test('a chat failure does not fail onboarding', async () => {
    const deps = createDeps();
    deps.sendChatMessage.mockRejectedValueOnce(new Error('function not found'));

    const result = await saveOnboarding(deps, PATIENT_ID, { ...BASE_ANSWERS, freeText: 'tired' }, NOW);

    expect(result.note).toBe('failed');
  });

  test('stops and rethrows when a required write fails, before touching chat', async () => {
    const deps = createDeps();
    const failure = new Error('plan failed');
    deps.saveMonitoringPlan.mockRejectedValueOnce(failure);

    await expect(saveOnboarding(deps, PATIENT_ID, { ...BASE_ANSWERS, freeText: 'tired' }, NOW)).rejects.toBe(failure);
    expect(deps.sendChatMessage).not.toHaveBeenCalled();
  });
});
