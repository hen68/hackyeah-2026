import type { Session } from '@supabase/supabase-js';

import type { Profile } from '@/lib/api/profile';

export type EntryRoute = 'loading' | 'auth' | 'onboarding' | 'tabs';

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
  // A missing profile row means onboarding never happened (the signup trigger creates it).
  if (profile === null || profile.onboarding_completed_at === null) return 'onboarding';
  return 'tabs';
}
