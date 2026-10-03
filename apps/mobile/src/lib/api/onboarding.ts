import type { TablesInsert } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type OnboardingQuestion = 'age_band' | 'last_period' | 'hrt_status' | 'symptoms';
export type OnboardingAnswer = { question: OnboardingQuestion; answer: string };

/**
 * Replaces all of the patient's answers (delete, then insert; the table has no update policy).
 * Not atomic, but retry-safe: a rerun converges on the same rows.
 */
export async function replaceOnboardingAnswers(
  patientId: string,
  answers: readonly OnboardingAnswer[],
): Promise<void> {
  const { error: deleteError } = await supabase.from('onboarding_answers').delete().eq('patient_id', patientId);
  if (deleteError) throw deleteError;

  const rows: TablesInsert<'onboarding_answers'>[] = answers.map((row) => ({ patient_id: patientId, ...row }));
  const { error: insertError } = await supabase.from('onboarding_answers').insert(rows);
  if (insertError) throw insertError;
}
