import { z } from 'zod';

import { parseLocalDate, toLocalDateString } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

/** Matches the `checkins_note_check` constraint. */
export const NOTE_MAX_LENGTH = 2000;

/** A real patient-local date that isn't in the future. */
const daySchema = z
  .string()
  .refine((day) => parseLocalDate(day) !== null, 'Invalid date')
  .refine((day) => day <= toLocalDateString(), 'Future dates cannot be logged');

const submitInputSchema = z.object({
  patientId: z.string().min(1),
  day: daySchema,
  answers: z.record(z.string().min(1), z.number().int().min(1).max(5)),
  /** Omitted leaves the saved note as it is. */
  note: z.string().max(NOTE_MAX_LENGTH).optional(),
});

export type SubmitCheckinInput = z.infer<typeof submitInputSchema>;

/**
 * Saves a whole check-in: the day's row (with its note when given; blank clears it), then every answer in one
 * upsert. Both writes are idempotent, so retrying after a partial failure converges.
 */
export async function submitCheckin(input: SubmitCheckinInput): Promise<void> {
  const { patientId, day, answers, note } = submitInputSchema.parse(input);
  const { data, error } = await supabase
    .from('checkins')
    .upsert(
      { patient_id: patientId, day, ...(note === undefined ? {} : { note: note.trim() || null }) },
      { onConflict: 'patient_id,day' },
    )
    .select('id')
    .single();
  if (error) throw error;
  const rows = Object.entries(answers).map(([symptomCode, severity]) => ({
    checkin_id: data.id,
    symptom_code: symptomCode,
    severity,
  }));
  if (rows.length === 0) return;
  const { error: entriesError } = await supabase
    .from('checkin_entries')
    .upsert(rows, { onConflict: 'checkin_id,symptom_code' });
  if (entriesError) throw entriesError;
}

const checkinDaysSchema = z.array(z.object({ day: z.string() }));

/** Days (YYYY-MM-DD, newest first) with a check-in on or after `since`. */
export async function getCheckinDays(patientId: string, since: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('day')
    .eq('patient_id', patientId)
    .gte('day', since)
    .order('day', { ascending: false });
  if (error) throw error;
  return checkinDaysSchema.parse(data).map((row) => row.day);
}
