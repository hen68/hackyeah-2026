import {
  AGE_OPTIONS,
  buildPlanCodes,
  DEFAULT_PLAN_CODES,
  type AgeBand,
  type LastPeriod,
} from '@/features/onboarding/answers';
import { inferStage, STAGE_COPY, type MenopauseStage, type StageAnswers } from '@/features/onboarding/stage';

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

const BASE: StageAnswers = { ageBand: '45_49', lastPeriod: 'lt_3m', hrtStatus: 'no', symptoms: ['tiredness'] };

describe('inferStage', () => {
  test('covers every age band', () => {
    expect(Object.keys(EXPECTED)).toEqual(AGE_OPTIONS.map((option) => option.value));
  });

  test.each(CASES)('no HRT, a non-vasomotor symptom: age %s + last period %s → %s', (age, period, stage) => {
    expect(inferStage({ ...BASE, ageBand: age, lastPeriod: period })).toBe(stage);
  });

  test('HRT makes a recent or unsure period unknown', () => {
    expect(inferStage({ ...BASE, hrtStatus: 'yes' })).toBe('unknown');
    expect(inferStage({ ...BASE, hrtStatus: 'yes', lastPeriod: '3_12m' })).toBe('unknown');
  });

  test('HRT does not change a period over 12 months ago', () => {
    expect(inferStage({ ...BASE, hrtStatus: 'yes', lastPeriod: 'gt_12m' })).toBe('menopause');
  });

  test('a recent period at 40-44 needs a symptom', () => {
    expect(inferStage({ ...BASE, ageBand: '40_44', symptoms: [] })).toBe('unknown');
    expect(inferStage({ ...BASE, ageBand: '45_49', symptoms: [] })).toBe('perimenopause');
  });

  test('unsure is perimenopause only at 45-54 with hot flushes or night sweats', () => {
    const unsure = { ...BASE, lastPeriod: 'unsure' as const, symptoms: ['night_sweats' as const] };
    expect(inferStage(unsure)).toBe('perimenopause');
    expect(inferStage({ ...unsure, ageBand: '50_54', symptoms: ['hot_flushes'] })).toBe('perimenopause');
    expect(inferStage({ ...unsure, ageBand: '40_44' })).toBe('unknown');
    expect(inferStage({ ...unsure, ageBand: '55_59' })).toBe('unknown');
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
