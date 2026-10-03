import { z } from 'zod';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

const CHAT_FUNCTION = 'chat';
/** A hung or cold function must fail instead of blocking the UI. */
const CHAT_TIMEOUT_MS = 15_000;
/** Newest messages loaded when the chat opens; older history lives in each day's detail. */
const CHAT_HISTORY_LIMIT = 50;

const observationSchema = z.object({
  symptom_code: z.string().nullish(),
  custom_label: z.string().nullish(),
  severity: z.number().int().min(1).max(5).nullish(),
  duration_days: z.number().int().nonnegative().nullish(),
  observed_on: z.string().nullish(),
});

const chatResponseSchema = z.object({
  reply: z.string(),
  observations: z.array(observationSchema),
  message_id: z.string(),
});

export type ChatObservation = z.infer<typeof observationSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export type SendChatInput = {
  message: string;
  inputMode: 'text' | 'voice';
  /** Patient-local date, YYYY-MM-DD. */
  localDate: string;
};

/** Calls the `chat` edge function (plan Step 3); 429 surfaces as FunctionsHttpError. */
export async function sendChatMessage({ message, inputMode, localDate }: SendChatInput): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke<unknown>(CHAT_FUNCTION, {
    body: { message, input_mode: inputMode, local_date: localDate },
    timeout: CHAT_TIMEOUT_MS,
  });
  if (error) throw error;
  return chatResponseSchema.parse(data);
}

type HistoryObservation = Pick<
  Tables<'observations'>,
  'id' | 'symptom_code' | 'custom_label' | 'severity' | 'duration_days' | 'observed_on'
>;

export type ChatHistoryRow = Pick<
  Tables<'chat_messages'>,
  'id' | 'role' | 'content' | 'input_mode' | 'local_date' | 'created_at'
> & { observations: HistoryObservation[] };

/** The patient's newest messages, newest first, each with the observations extracted from it (RLS-scoped). */
export async function getChatHistory(patientId: string): Promise<ChatHistoryRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(
      'id, role, content, input_mode, local_date, created_at, observations(id, symptom_code, custom_label, severity, duration_days, observed_on)',
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(CHAT_HISTORY_LIMIT);
  if (error) throw error;
  return data;
}
