import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { toPlanSymptoms } from '@/features/today/check-in';
import { addDays } from '@/features/today/streak';
import { getCheckinDays, submitCheckin } from '@/lib/api/checkins';
import { getDay } from '@/lib/api/day';
import { getMonitoringPlan, getSymptomCatalog } from '@/lib/api/plan';
import { parseLocalDate, toLocalDateString } from '@/lib/dates';
import type { Severity } from '@/theme/tokens';

/** How far back streaks and the doctor-notes count look. */
const CHECKIN_DAYS_LOOKBACK = 400;

export const dayKeys = {
  detail: (day: string) => ['day', day] as const,
};
/** Prefix for Step 9a month queries; invalidated whenever a day changes. */
export const CALENDAR_KEY = ['calendar'] as const;
const checkinDaysKey = (patientId: string) => ['checkin-days', patientId] as const;

export function useDay(day: string) {
  return useQuery({ queryKey: dayKeys.detail(day), queryFn: () => getDay(day), enabled: parseLocalDate(day) !== null });
}

export function useSymptomCatalog() {
  return useQuery({ queryKey: ['symptom-catalog'], queryFn: getSymptomCatalog, staleTime: Infinity });
}

export function usePlanSymptoms(patientId: string) {
  const catalog = useSymptomCatalog();
  const plan = useQuery({ queryKey: ['monitoring-plan', patientId], queryFn: () => getMonitoringPlan(patientId) });
  const symptoms = useMemo(
    () => (catalog.data && plan.isSuccess ? toPlanSymptoms(catalog.data, plan.data?.symptom_codes ?? null) : undefined),
    [catalog.data, plan.isSuccess, plan.data],
  );
  return {
    symptoms,
    catalog: catalog.data,
    error: catalog.error ?? plan.error,
    refetch: () => Promise.all([catalog.refetch(), plan.refetch()]),
  };
}

/** Days with a check-in over the lookback window, newest first; feeds streaks and the garden. */
export function useCheckinDays(patientId: string) {
  return useQuery({
    queryKey: checkinDaysKey(patientId),
    queryFn: () => getCheckinDays(patientId, addDays(toLocalDateString(), -CHECKIN_DAYS_LOOKBACK)),
    enabled: patientId !== '',
  });
}

type SubmitVars = { answers: Readonly<Record<string, Severity>>; note: string };

/** Saves the whole check-in for `day`, then refreshes everything that shows it. */
export function useSubmitCheckin(patientId: string, day: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ answers, note }: SubmitVars) => submitCheckin({ patientId, day, answers: { ...answers }, note }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: dayKeys.detail(day) }),
        queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
        queryClient.invalidateQueries({ queryKey: checkinDaysKey(patientId) }),
      ]),
  });
}
