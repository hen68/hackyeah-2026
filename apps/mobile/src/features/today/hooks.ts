import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { toPlanSymptoms, withEntry } from '@/features/today/check-in';
import { saveEntry, saveNote } from '@/lib/api/checkins';
import { getDay, type DayData } from '@/lib/api/day';
import { getMonitoringPlan, getSymptomCatalog } from '@/lib/api/plan';
import { parseLocalDate } from '@/lib/dates';
import type { Severity } from '@/theme/tokens';

export const NOTE_DEBOUNCE_MS = 500;

export const dayKeys = {
  detail: (day: string) => ['day', day] as const,
};
/** Prefix for Step 9a month queries; invalidated whenever a day changes. */
const CALENDAR_KEY = ['calendar'] as const;

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

type EntryVars = { symptomCode: string; severity: Severity };

/** Rates a symptom, updating the cached day immediately and rolling back on failure. */
export function useSaveEntry(patientId: string, day: string) {
  const queryClient = useQueryClient();
  const key = dayKeys.detail(day);
  return useMutation({
    mutationFn: ({ symptomCode, severity }: EntryVars) => saveEntry({ patientId, day, symptomCode, severity }),
    onMutate: async ({ symptomCode, severity }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DayData>(key);
      if (previous) queryClient.setQueryData(key, withEntry(previous, symptomCode, severity));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY });
    },
  });
}

/** Local note text that saves `NOTE_DEBOUNCE_MS` after typing stops, and on unmount. */
export function useNoteAutosave(patientId: string, day: string, initialNote: string) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState(initialNote);
  const savedNote = useRef(initialNote);
  const pendingNote = useRef<string | null>(null);
  const mutation = useMutation({
    mutationFn: (text: string) => saveNote({ patientId, day, note: text }),
    onSuccess: (_data, text) => {
      savedNote.current = text;
      queryClient.invalidateQueries({ queryKey: dayKeys.detail(day) });
    },
  });
  const { mutate } = mutation;

  useEffect(() => {
    if (note === savedNote.current) return;
    pendingNote.current = note;
    const timer = setTimeout(() => {
      pendingNote.current = null;
      mutate(note);
    }, NOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [note, mutate]);

  // Leaving the screen mid-debounce must not drop the last keystrokes.
  useEffect(
    () => () => {
      if (pendingNote.current !== null) mutate(pendingNote.current);
    },
    [mutate],
  );

  return { note, setNote, isError: mutation.isError };
}
