import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

type Client = Pick<SupabaseClient<Database>, 'auth'>;

/** Auth flows from plan Step 5b. Each throws the Supabase error so callers can map it. */
export function createAuthService(client: Client) {
  return {
    /** "Get started": an anonymous session; the profile row is created by a DB trigger. */
    async startAnonymous(): Promise<void> {
      const { error } = await client.auth.signInAnonymously();
      if (error) throw error;
    },

    /** "I already have an account": sends a code, never creates a new user. */
    async requestSignInCode(email: string): Promise<void> {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
    },

    async verifySignInCode(email: string, token: string): Promise<void> {
      const { error } = await client.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
      if (error) throw error;
    },

    /** Profile "Save my account": attaches an email to the current anonymous user. */
    async requestLinkEmail(email: string): Promise<void> {
      const { error } = await client.auth.updateUser({ email: email.trim() });
      if (error) throw error;
    },

    async verifyLinkEmail(email: string, token: string): Promise<void> {
      const { error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'email_change',
      });
      if (error) throw error;
    },

    async signOut(): Promise<void> {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
