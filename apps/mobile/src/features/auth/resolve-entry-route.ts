import type { Session } from '@supabase/supabase-js';

import type { Profile } from '@/lib/api/profile';

export type EntryRoute = 'loading' | 'error' | 'auth' | 'onboarding' | 'tabs';

/**
 * Decides which route group the user may see.
 * `undefined` means "not known yet" (session restoring / profile loading).
 */
export function resolveEntryRoute(
  session: Session | null | undefined,
  profile: Pick<Profile, 'onboarding_completed_at'> | null | undefined,
): EntryRoute {
  if (session === undefined) return 'loading';
  if (session === null) return 'auth';
  if (profile === undefined) return 'loading';
  // The signup trigger always creates the row and clients can't insert one, so its absence is an error.
  if (profile === null) return 'error';
  if (profile.onboarding_completed_at === null) return 'onboarding';
  return 'tabs';
}
