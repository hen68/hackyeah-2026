import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type SymptomCatalogItem = Tables<'symptom_catalog'>;
export type MonitoringPlan = Tables<'monitoring_plans'>;

export async function getSymptomCatalog(): Promise<SymptomCatalogItem[]> {
  const { data, error } = await supabase.from('symptom_catalog').select('*').order('sort');
  if (error) throw error;
  return data;
}

export async function getMonitoringPlan(patientId: string): Promise<MonitoringPlan | null> {
  const { data, error } = await supabase
    .from('monitoring_plans')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveMonitoringPlan(patientId: string, symptomCodes: readonly string[]): Promise<MonitoringPlan> {
  const { data, error } = await supabase
    .from('monitoring_plans')
    .upsert({ patient_id: patientId, symptom_codes: [...symptomCodes] }, { onConflict: 'patient_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
