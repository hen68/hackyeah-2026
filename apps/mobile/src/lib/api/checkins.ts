import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { Severity } from '@/theme/tokens';

export type CheckinEntry = Tables<'checkin_entries'>;
export type Checkin = Tables<'checkins'> & { checkin_entries: CheckinEntry[] };

/** One rated symptom: either a catalog code or a free-text label (from Chat). */
export type EntryInput =
  | { symptomCode: string; customLabel?: never; severity: Severity }
  | { symptomCode?: never; customLabel: string; severity: Severity };

export type SaveCheckinInput = {
  patientId: string;
  /** Patient-local date, YYYY-MM-DD. */
  day: string;
  note: string | null;
  entries: readonly EntryInput[];
};

export async function getCheckin(patientId: string, day: string): Promise<Checkin | null> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*, checkin_entries(*)')
    .eq('patient_id', patientId)
    .eq('day', day)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Upserts the day's check-in and its entries (one per symptom). */
export async function saveCheckin({ patientId, day, note, entries }: SaveCheckinInput): Promise<void> {
  const { data: checkin, error } = await supabase
    .from('checkins')
    .upsert({ patient_id: patientId, day, note }, { onConflict: 'patient_id,day' })
    .select('id')
    .single();
  if (error) throw error;

  const catalogRows = entries.flatMap((entry) =>
    entry.symptomCode ? [{ checkin_id: checkin.id, symptom_code: entry.symptomCode, severity: entry.severity }] : [],
  );
  const customRows = entries.flatMap((entry) =>
    entry.customLabel ? [{ checkin_id: checkin.id, custom_label: entry.customLabel, severity: entry.severity }] : [],
  );

  if (catalogRows.length > 0) {
    const { error: catalogError } = await supabase
      .from('checkin_entries')
      .upsert(catalogRows, { onConflict: 'checkin_id,symptom_code' });
    if (catalogError) throw catalogError;
  }
  if (customRows.length > 0) {
    const { error: customError } = await supabase
      .from('checkin_entries')
      .upsert(customRows, { onConflict: 'checkin_id,custom_label' });
    if (customError) throw customError;
  }
}
