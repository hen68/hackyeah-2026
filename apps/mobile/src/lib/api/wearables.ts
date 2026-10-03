import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type WearableConnection = Tables<'wearable_connections'>;
export type WearableNight = Tables<'wearable_nights'>;

export async function listWearableConnections(patientId: string): Promise<WearableConnection[]> {
  const { data, error } = await supabase.from('wearable_connections').select('*').eq('patient_id', patientId);
  if (error) throw error;
  return data;
}

/** Nights for one patient-local date (YYYY-MM-DD), one row per provider. */
export async function getWearableNights(patientId: string, nightOf: string): Promise<WearableNight[]> {
  const { data, error } = await supabase
    .from('wearable_nights')
    .select('*')
    .eq('patient_id', patientId)
    .eq('night_of', nightOf);
  if (error) throw error;
  return data;
}
