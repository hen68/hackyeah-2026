import {
  AGE_OPTIONS,
  buildPlanCodes,
  DEFAULT_PLAN_CODES,
  type AgeBand,
  type LastPeriod,
} from '@/features/onboarding/answers';
import { inferStage, STAGE_COPY, type MenopauseStage } from '@/features/onboarding/stage';

const EXPECTED: Record<AgeBand, Record<LastPeriod, MenopauseStage>> = {
  '40_44': { lt_3m: 'perimenopause', '3_12m': 'perimenopause', gt_12m: 'menopause', unsure: 'unknown' },
  '45_49': { lt_3m: 'perimenopause', '3_12m': 'perimenopause', gt_12m: 'menopause', unsure: 'unknown' },
  '50_54': { lt_3m: 'perimenopause', '3_12m': 'perimenopause', gt_12m: 'menopause', unsure: 'unknown' },
  '55_59': { lt_3m: 'perimenopause', '3_12m': 'perimenopause', gt_12m: 'postmenopause', unsure: 'unknown' },
  '60_plus': { lt_3m: 'perimenopause', '3_12m': 'perimenopause', gt_12m: 'postmenopause', unsure: 'unknown' },
};

const CASES = Object.entries(EXPECTED).flatMap(([age, byPeriod]) =>
  Object.entries(byPeriod).map(([period, stage]) => [age as AgeBand, period as LastPeriod, stage] as const),
);

describe('inferStage', () => {
  test('covers every age band', () => {
    expect(Object.keys(EXPECTED)).toEqual(AGE_OPTIONS.map((option) => option.value));
  });

  test.each(CASES)('age %s + last period %s → %s', (age, period, stage) => {
    expect(inferStage(age, period)).toBe(stage);
  });
});

describe('STAGE_COPY', () => {
  test('unknown reuses the perimenopause body and adds an unsure note', () => {
    expect(STAGE_COPY.unknown.body).toBe(STAGE_COPY.perimenopause.body);
    expect(STAGE_COPY.unknown.note).toBeTruthy();
  });
});

describe('buildPlanCodes', () => {
  test('keeps defaults first and appends only new picks', () => {
    expect(buildPlanCodes(['sleep', 'tiredness', 'vaginal_dryness'])).toEqual([
      ...DEFAULT_PLAN_CODES,
      'tiredness',
      'vaginal_dryness',
    ]);
  });
});
