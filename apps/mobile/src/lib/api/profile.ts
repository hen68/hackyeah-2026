import type { Tables, TablesUpdate } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Profile = Tables<'profiles'>;

/** Columns a patient may edit (role is server-controlled). */
export type ProfilePatch = Omit<TablesUpdate<'profiles'>, 'id' | 'role' | 'created_at' | 'updated_at'>;

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
  if (error) throw error;
  return data;
}
