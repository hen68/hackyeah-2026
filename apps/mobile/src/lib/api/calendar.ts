import { z } from 'zod';

import { supabase } from '@/lib/supabase';

const calendarDaySchema = z.object({
  day: z.string(),
  status: z.enum(['good', 'okay', 'hard', 'none']),
  has_bleeding: z.boolean(),
  has_checkin: z.boolean(),
});

export type CalendarDay = z.infer<typeof calendarDaySchema>;

/** One row per day of the month containing `month` (any YYYY-MM-DD in it). */
export async function getCalendarMonth(month: string): Promise<CalendarDay[]> {
  const { data, error } = await supabase.rpc('get_calendar_month', { p_month: month });
  if (error) throw error;
  return z.array(calendarDaySchema).parse(data);
}
