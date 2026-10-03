import { AGE_OPTIONS } from '@/features/onboarding/answers';
import type { Profile } from '@/lib/api/profile';

const STAGE_LABELS: Record<string, string> = {
  perimenopause: 'Likely perimenopause',
  menopause: 'Likely menopause',
  postmenopause: 'Likely past menopause',
  unknown: 'Stage not sure yet',
};

const HRT_LABELS: Record<string, string> = {
  yes: 'On HRT',
  no: 'No HRT',
  unsure: 'Not sure about HRT',
};

export type ProfileSummary = { name: string; initial: string; details: string };

/** Header card copy; `email` stands in until the patient sets a display name. */
export function summarizeProfile(
  profile: Pick<Profile, 'display_name' | 'age_band' | 'menopause_stage' | 'hrt_status'>,
  email: string,
): ProfileSummary {
  const name = profile.display_name?.trim() || email.split('@')[0] || 'You';
  const age = AGE_OPTIONS.find((option) => option.value === profile.age_band)?.label;
  const details = [
    profile.menopause_stage ? STAGE_LABELS[profile.menopause_stage] : null,
    profile.hrt_status ? HRT_LABELS[profile.hrt_status] : null,
    age ? `Age ${age}` : null,
  ].filter(Boolean);
  return { name, initial: name.charAt(0).toUpperCase(), details: details.join(' · ') };
}

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

/** "It expires in 23 h." for a link code; null once it has expired. */
export function formatExpiry(expiresAt: string, now: Date): string | null {
  const minutes = Math.floor((new Date(expiresAt).getTime() - now.getTime()) / MS_PER_MINUTE);
  if (minutes <= 0) return null;
  if (minutes < MINUTES_PER_HOUR) return `It expires in ${minutes} min.`;
  return `It expires in ${Math.floor(minutes / MINUTES_PER_HOUR)} h.`;
}
