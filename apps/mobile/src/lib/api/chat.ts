import { z } from 'zod';

import { supabase } from '@/lib/supabase';

const CHAT_FUNCTION = 'chat';

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
  });
  if (error) throw error;
  return chatResponseSchema.parse(data);
}
