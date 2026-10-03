import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SeverityPicker } from '@/components/ui/severity-picker';
import { isSeverity, minutesSpent, questionFor, type PlanSymptom } from '@/features/today/check-in';
import { useSubmitCheckin } from '@/features/today/hooks';
import { watchHint } from '@/features/today/watch';
import type { DayWearableNight } from '@/lib/api/day';
import { toUserMessage } from '@/lib/errors';
import { colors, spacing, type, type Severity } from '@/theme/tokens';

type CheckInCardProps = {
  patientId: string;
  day: string;
  isToday: boolean;
  symptoms: readonly PlanSymptom[];
  answered: Readonly<Record<string, number>>;
  night: DayWearableNight | null;
  /** Called once the check-in is saved, before the success screen opens. */
  onSaved?: () => void;
};

/** Long enough to see the picked answer highlighted before the next question replaces it. */
export const ADVANCE_DELAY_MS = 250;

function toSeverities(answered: Readonly<Record<string, number>>): Record<string, Severity> {
  return Object.fromEntries(
    Object.entries(answered).flatMap(([code, value]) => (isSeverity(value) ? [[code, value]] : [])),
  );
}

/**
 * "Today's check-in" from the Today artboard: one question at a time. Picking an answer moves on;
 * the last answer saves the whole check-in and opens the success screen.
 */
export function CheckInCard({
  patientId,
  day,
  isToday,
  symptoms,
  answered,
  night,
  onSaved,
}: CheckInCardProps) {
  const codes = symptoms.map((symptom) => symptom.code);
  const [answers, setAnswers] = useState(() => toSeverities(answered));
  const [index, setIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const submit = useSubmitCheckin(patientId, day);
  // isPending lags a render behind, so a fast second tap needs a synchronous guard.
  const isSaving = useRef(false);
  const isUpdate = Object.keys(answered).length > 0;
  // Set while a picked answer is on screen; taps in that window are ignored.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(advanceTimer.current ?? undefined), []);

  const remaining = codes.filter((code) => answers[code] === undefined).length;
  const progress = codes.length > 0 ? (codes.length - remaining) / codes.length : 1;
  const open = symptoms[index];
  const question = open ? questionFor(open.code, open.label) : '';
  const hint = open ? watchHint(open.code, night) : null;

  const goTo = (next: number) => {
    const target = symptoms[next];
    if (!target) return;
    setIndex(next);
    AccessibilityInfo.announceForAccessibility(
      `Question ${next + 1} of ${symptoms.length}. ${questionFor(target.code, target.label)}`,
    );
  };

  const save = async (all: Readonly<Record<string, Severity>>) => {
    if (isSaving.current) return;
    isSaving.current = true;
    // mutateAsync, not mutate(onSuccess): per-call callbacks are dropped if the card unmounts
    // (Home swaps in the done card) before the save settles.
    try {
      await submit.mutateAsync({ answers: all });
    } catch {
      return; // Shown through submit.isError, with Try again.
    } finally {
      isSaving.current = false;
    }
    AccessibilityInfo.announceForAccessibility('Check-in saved');
    onSaved?.();
    router.push({
      pathname: '/checkin-done',
      // Minutes only mean something for a fresh check-in, not an edit.
      params: isUpdate ? { day } : { day, minutes: String(minutesSpent(startedAt, Date.now())) },
    });
  };

  const handlePick = (severity: Severity) => {
    if (!open || isSaving.current || advanceTimer.current) return;
    const next = { ...answers, [open.code]: severity };
    setAnswers(next);
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      if (index < symptoms.length - 1) {
        goTo(index + 1);
        return;
      }
      // Questions run in order from the first, so the last answer completes the check-in.
      save(next);
    }, ADVANCE_DELAY_MS);
  };

  if (symptoms.length === 0) {
    return (
      <Card accessibilityLabel="Today’s check-in">
        <Text accessibilityRole="header" style={styles.title}>
          No questions yet
        </Text>
        <Text style={styles.muted}>
          Your plan has no symptoms to track yet. You can still tell Digna how you feel below.
        </Text>
      </Card>
    );
  }

  return (
    <Card accessibilityLabel={isToday ? 'Today’s check-in' : 'Change this day'}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            {isToday ? 'Today’s check-in' : 'How was this day?'}
          </Text>
          <Text style={styles.toGo}>{`${index + 1} of ${symptoms.length}`}</Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: codes.length, now: codes.length - remaining }}
          style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      {open && (
        <Card tone="soft">
          <Text accessibilityRole="header" style={styles.question}>
            {question}
          </Text>
          {hint && <Text style={styles.hint}>{hint}</Text>}
          <SeverityPicker value={answers[open.code] ?? null} onChange={handlePick} accessibilityLabel={question} />
        </Card>
      )}

      {submit.isPending && (
        <Text accessibilityRole="alert" style={styles.muted}>
          Saving your check-in…
        </Text>
      )}
      {submit.isError && (
        <View style={styles.errorGroup}>
          <Text accessibilityRole="alert" style={styles.error}>
            {toUserMessage(submit.error)}
          </Text>
          <PrimaryButton label="Try again" onPress={() => save(answers)} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.xs },
  title: { ...type.heading, color: colors.text, flexShrink: 1 },
  toGo: { ...type.label, fontSize: 18, color: colors.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.progressTrack, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  question: { ...type.question, color: colors.text },
  hint: { ...type.body, fontSize: 17, lineHeight: 24, color: colors.tealDark },
  muted: { ...type.body, color: colors.textMuted },
  errorGroup: { gap: spacing.sm },
  error: { ...type.body, fontSize: 17, color: colors.accentPressed },
});
