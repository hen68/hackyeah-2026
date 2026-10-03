import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

type Client = Pick<SupabaseClient<Database>, 'auth'>;

/** `confirm_email` only happens if "Confirm email" is on in the Supabase project. */
export type RegisterResult = 'signed_in' | 'confirm_email';

/** Email + password auth. Each method throws the Supabase error so callers can map it. */
export function createAuthService(client: Client) {
  return {
    /** Creates the account; the profile row is created by a DB trigger. */
    async register(email: string, password: string): Promise<RegisterResult> {
      const { data, error } = await client.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      return data.session ? 'signed_in' : 'confirm_email';
    },

    async signIn(email: string, password: string): Promise<void> {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },

    async signOut(): Promise<void> {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
