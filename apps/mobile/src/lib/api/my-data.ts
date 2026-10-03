import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type Result<T> = { data: T; error: PostgrestError | null };

function unwrap<T>({ data, error }: Result<T>): T {
  if (error) throw error;
  return data;
}

/** Everything Digna stores about the patient, readable under their own RLS. Each list is capped by the API's row limit (1000). */
export async function getMyData(patientId: string, now: Date = new Date()) {
  const [profile, answers, plan, checkins, messages, observations, nights, watches] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', patientId).maybeSingle(),
    supabase.from('onboarding_answers').select('question, answer, created_at').eq('patient_id', patientId),
    supabase.from('monitoring_plans').select('symptom_codes, updated_at').eq('patient_id', patientId).maybeSingle(),
    supabase
      .from('checkins')
      .select('day, note, checkin_entries(symptom_code, custom_label, severity)')
      .eq('patient_id', patientId)
      .order('day'),
    supabase
      .from('chat_messages')
      .select('role, content, input_mode, local_date, created_at')
      .eq('patient_id', patientId)
      .order('created_at'),
    supabase
      .from('observations')
      .select('observed_on, symptom_code, custom_label, severity, duration_days, source')
      .eq('patient_id', patientId)
      .order('observed_on'),
    supabase
      .from('wearable_nights')
      .select('night_of, provider, sleep_minutes, awakenings, resting_hr, skin_temp_delta_c, warm_at')
      .eq('patient_id', patientId)
      .order('night_of'),
    supabase.from('wearable_connections').select('provider, created_at').eq('patient_id', patientId),
  ]);
  return {
    exported_at: now.toISOString(),
    profile: unwrap(profile),
    onboarding_answers: unwrap(answers),
    monitoring_plan: unwrap(plan),
    checkins: unwrap(checkins),
    chat_messages: unwrap(messages),
    observations: unwrap(observations),
    wearable_nights: unwrap(nights),
    wearable_connections: unwrap(watches),
  };
}

export type MyData = Awaited<ReturnType<typeof getMyData>>;
