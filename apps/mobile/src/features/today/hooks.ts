import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { toPlanSymptoms, withEntry } from '@/features/today/check-in';
import { saveEntry, saveNote } from '@/lib/api/checkins';
import { getDay, type DayData } from '@/lib/api/day';
import { getMonitoringPlan, getSymptomCatalog } from '@/lib/api/plan';
import { parseLocalDate } from '@/lib/dates';
import type { Severity } from '@/theme/tokens';

export const NOTE_DEBOUNCE_MS = 500;
const NOTE_SAVE_RETRIES = 2;

export const dayKeys = {
  detail: (day: string) => ['day', day] as const,
};
/** Prefix for Step 9a month queries; invalidated whenever a day changes. */
export const CALENDAR_KEY = ['calendar'] as const;

/** Entry and note writes for one day run one at a time, so they land in the order they were made. */
const checkinScope = (day: string) => ({ id: `checkin-${day}` });

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

/** Rates a symptom, updating the cached day immediately; a failure refetches the server truth. */
export function useSaveEntry(patientId: string, day: string) {
  const queryClient = useQueryClient();
  const key = dayKeys.detail(day);
  const mutationKey = ['save-entry', day];
  return useMutation({
    mutationKey,
    scope: checkinScope(day),
    mutationFn: ({ symptomCode, severity }: EntryVars) => saveEntry({ patientId, day, symptomCode, severity }),
    onMutate: async ({ symptomCode, severity }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DayData>(key);
      if (previous) queryClient.setQueryData(key, withEntry(previous, symptomCode, severity));
    },
    onSettled: () => {
      // A refetch while later picks are still saving would wipe their optimistic entries.
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY });
    },
  });
}

/**
 * Local note text that saves `NOTE_DEBOUNCE_MS` after typing stops, and again when the app is
 * backgrounded or the screen unmounts while a change is unsaved (including after a failed save).
 */
export function useNoteAutosave(patientId: string, day: string, initialNote: string) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState(initialNote);
  const requestedNote = useRef<string | null>(initialNote);
  const pendingNote = useRef<string | null>(null);
  const mutation = useMutation({
    scope: checkinScope(day),
    retry: NOTE_SAVE_RETRIES,
    mutationFn: (text: string) => saveNote({ patientId, day, note: text }),
    onSuccess: (_data, text) => {
      if (pendingNote.current === text) pendingNote.current = null;
      queryClient.invalidateQueries({ queryKey: dayKeys.detail(day) });
    },
    onError: () => {
      requestedNote.current = null;
    },
  });
  const { mutate } = mutation;

  const send = useCallback(
    (text: string) => {
      requestedNote.current = text;
      mutate(text);
    },
    [mutate],
  );

  useEffect(() => {
    if (note === requestedNote.current) {
      pendingNote.current = null;
      return;
    }
    pendingNote.current = note;
    const timer = setTimeout(() => send(note), NOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [note, send]);

  const flush = useCallback(() => {
    if (pendingNote.current !== null) send(pendingNote.current);
  }, [send]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush();
    });
    return () => subscription.remove();
  }, [flush]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useEffect(() => () => flushRef.current(), []);

  return { note, setNote, isError: mutation.isError };
}
