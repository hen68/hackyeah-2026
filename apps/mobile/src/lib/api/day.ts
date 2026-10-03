import { z } from 'zod';

import { supabase } from '@/lib/supabase';

const entrySchema = z.object({
  symptom_code: z.string().nullable(),
  custom_label: z.string().nullable(),
  severity: z.number().int().min(1).max(5),
});

const observationSchema = z.object({
  id: z.string(),
  symptom_code: z.string().nullable(),
  custom_label: z.string().nullable(),
  severity: z.number().int().min(1).max(5).nullable(),
});

const chatMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  created_at: z.string(),
});

const wearableNightSchema = z.object({
  provider: z.string(),
  sleep_minutes: z.number().nullable(),
  awakenings: z.number().nullable(),
  resting_hr: z.number().nullable(),
  skin_temp_delta_c: z.number().nullable(),
  warm_at: z.string().nullable(),
});

/** Shape of the `get_day(p_day)` RPC (migration 20261003193746_day_calendar_rpcs). */
const daySchema = z.object({
  day: z.string(),
  checkin: z.object({ id: z.string(), note: z.string().nullable() }).nullable(),
  entries: z.array(entrySchema),
  observations: z.array(observationSchema),
  chat_messages: z.array(chatMessageSchema),
  wearable_nights: z.array(wearableNightSchema),
});

export type DayData = z.infer<typeof daySchema>;
export type DayEntry = z.infer<typeof entrySchema>;
export type DayWearableNight = z.infer<typeof wearableNightSchema>;

export function parseDay(raw: unknown): DayData {
  return daySchema.parse(raw);
}

/** Everything logged for one patient-local date (YYYY-MM-DD). */
export async function getDay(day: string): Promise<DayData> {
  const { data, error } = await supabase.rpc('get_day', { p_day: day });
  if (error) throw error;
  return parseDay(data);
}
