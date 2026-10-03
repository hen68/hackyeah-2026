import type { AgeBand, LastPeriod } from '@/features/onboarding/answers';

/** Matches `profiles_menopause_stage_check`. */
export type MenopauseStage = 'perimenopause' | 'menopause' | 'postmenopause' | 'unknown';

const POSTMENOPAUSE_AGE_BANDS: ReadonlySet<AgeBand> = new Set(['55_59', '60_plus']);

/** Plan Step 6 rule. A guess for the patient's orientation, never a diagnosis. */
export function inferStage(ageBand: AgeBand, lastPeriod: LastPeriod): MenopauseStage {
  switch (lastPeriod) {
    case 'lt_3m':
    case '3_12m':
      return 'perimenopause';
    case 'gt_12m':
      return POSTMENOPAUSE_AGE_BANDS.has(ageBand) ? 'postmenopause' : 'menopause';
    case 'unsure':
      return 'unknown';
  }
}

type StageCopy = { title: string; body: string; note?: string };

const PERIMENOPAUSE_BODY = 'These are the years before periods stop. Symptoms can come and go, and that is normal.';

/** OnbResult hero copy. `unknown` shows perimenopause-style copy with an "unsure" note. */
export const STAGE_COPY: Record<MenopauseStage, StageCopy> = {
  perimenopause: { title: 'You are likely in perimenopause', body: PERIMENOPAUSE_BODY },
  menopause: {
    title: 'You are likely in menopause',
    body: 'Your periods stopped about a year ago. Symptoms like hot flushes are still common now.',
  },
  postmenopause: {
    title: 'You are likely past menopause',
    body: 'Your periods stopped some time ago. Some symptoms can last for years, and help is available.',
  },
  unknown: {
    title: 'You may be in perimenopause',
    body: PERIMENOPAUSE_BODY,
    note: 'Your answers don’t tell us for sure. Your doctor can help you find out.',
  },
};
