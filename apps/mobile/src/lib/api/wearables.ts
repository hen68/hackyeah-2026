import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type WearableConnection = Tables<'wearable_connections'>;
export type WearableNight = Tables<'wearable_nights'>;

export async function listWearableConnections(patientId: string): Promise<WearableConnection[]> {
  const { data, error } = await supabase.from('wearable_connections').select('*').eq('patient_id', patientId);
  if (error) throw error;
  return data;
}

/** Marks a provider as connected (no sync yet). Re-connecting keeps the original row. */
export async function connectWearable(patientId: string, provider: string): Promise<void> {
  const { error } = await supabase
    .from('wearable_connections')
    .upsert({ patient_id: patientId, provider }, { onConflict: 'patient_id,provider', ignoreDuplicates: true });
  if (error) throw error;
}

export async function disconnectWearable(patientId: string, provider: string): Promise<void> {
  const { error } = await supabase
    .from('wearable_connections')
    .delete()
    .eq('patient_id', patientId)
    .eq('provider', provider);
  if (error) throw error;
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
