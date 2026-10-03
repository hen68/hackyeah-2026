import type { Session } from '@supabase/supabase-js';

import { resolveEntryRoute } from '@/features/auth/resolve-entry-route';

const session = { user: { id: 'user-1' } } as Session;

describe('resolveEntryRoute', () => {
  test('waits while the stored session is restoring', () => {
    expect(resolveEntryRoute(undefined, undefined)).toBe('loading');
  });

  test('sends signed-out users to auth', () => {
    expect(resolveEntryRoute(null, undefined)).toBe('auth');
  });

  test('waits while the profile is loading', () => {
    expect(resolveEntryRoute(session, undefined)).toBe('loading');
  });

  test('treats a missing profile row as an error (clients cannot create one)', () => {
    expect(resolveEntryRoute(session, null)).toBe('error');
  });

  test('sends users who have not finished onboarding to onboarding', () => {
    expect(resolveEntryRoute(session, { onboarding_completed_at: null })).toBe('onboarding');
  });

  test('sends onboarded users to the tabs', () => {
    expect(resolveEntryRoute(session, { onboarding_completed_at: '2026-10-03T10:00:00Z' })).toBe('tabs');
  });
});
