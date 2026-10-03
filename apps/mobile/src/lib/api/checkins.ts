import { z } from 'zod';

import { supabase } from '@/lib/supabase';

/** Matches the `checkins_note_check` constraint. */
export const NOTE_MAX_LENGTH = 2000;

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const entryInputSchema = z.object({
  patientId: z.string().min(1),
  day: daySchema,
  symptomCode: z.string().min(1),
  severity: z.number().int().min(1).max(5),
});

const noteInputSchema = z.object({
  patientId: z.string().min(1),
  day: daySchema,
  note: z.string().max(NOTE_MAX_LENGTH),
});

export type SaveEntryInput = z.infer<typeof entryInputSchema>;
export type SaveNoteInput = z.infer<typeof noteInputSchema>;

/** Creates the day's check-in if missing; never touches its note. Returns its id. */
async function ensureCheckin(patientId: string, day: string): Promise<string> {
  const { data, error } = await supabase
    .from('checkins')
    .upsert({ patient_id: patientId, day }, { onConflict: 'patient_id,day' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Rates one plan symptom for a day. Each write is a single idempotent upsert, so a retry after a
 * partial failure converges (at worst an empty check-in row is left behind).
 */
export async function saveEntry(input: SaveEntryInput): Promise<void> {
  const { patientId, day, symptomCode, severity } = entryInputSchema.parse(input);
  const checkinId = await ensureCheckin(patientId, day);
  const { error } = await supabase
    .from('checkin_entries')
    .upsert({ checkin_id: checkinId, symptom_code: symptomCode, severity }, { onConflict: 'checkin_id,symptom_code' });
  if (error) throw error;
}

/** Sets the day's note; blank clears it. */
export async function saveNote(input: SaveNoteInput): Promise<void> {
  const { patientId, day, note } = noteInputSchema.parse(input);
  const { error } = await supabase
    .from('checkins')
    .upsert({ patient_id: patientId, day, note: note.trim() || null }, { onConflict: 'patient_id,day' });
  if (error) throw error;
}
