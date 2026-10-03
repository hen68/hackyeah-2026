import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createAuthService, type AuthService } from '@/features/auth/auth-service';
import { useProfile } from '@/features/profile/hooks';
import type { Profile } from '@/lib/api/profile';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  /** `undefined` while the stored session is being restored. */
  session: Session | null | undefined;
  /** `undefined` while loading or signed out. */
  profile: Profile | null | undefined;
  profileError: Error | null;
  retryProfile: () => void;
  auth: AuthService;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const authService = createAuthService(supabase);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const userId = session?.user.id;
  const profileQuery = useProfile(userId);
  const { refetch: refetchProfile } = profileQuery;

  useEffect(() => {
    // Fires INITIAL_SESSION first, so this also restores the stored session.
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile: userId ? profileQuery.data : undefined,
      profileError: profileQuery.error,
      retryProfile: () => void refetchProfile(),
      auth: authService,
    }),
    [session, userId, profileQuery.data, profileQuery.error, refetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
