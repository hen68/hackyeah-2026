import { z } from 'zod';

import { supabase } from '@/lib/supabase';

const linkCodeSchema = z.object({ code: z.string(), expires_at: z.string() });

export type LinkCode = z.infer<typeof linkCodeSchema>;

/** One-time code a doctor redeems to link to this patient. */
export async function createLinkCode(): Promise<LinkCode> {
  const { data, error } = await supabase.rpc('create_link_code');
  if (error) throw error;
  return linkCodeSchema.parse(Array.isArray(data) ? data[0] : data);
}
