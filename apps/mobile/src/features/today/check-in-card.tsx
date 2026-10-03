import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SeverityPicker } from '@/components/ui/severity-picker';
import {
  firstUnansweredIndex,
  isSeverity,
  minutesSpent,
  questionFor,
  type PlanSymptom,
} from '@/features/today/check-in';
import { useSubmitCheckin } from '@/features/today/hooks';
import { watchHint } from '@/features/today/watch';
import { NOTE_MAX_LENGTH } from '@/lib/api/checkins';
import type { DayWearableNight } from '@/lib/api/day';
import { toUserMessage } from '@/lib/errors';
import { colors, radii, sizes, spacing, type, type Severity } from '@/theme/tokens';

const NOTE_MIN_HEIGHT = 88;

type CheckInCardProps = {
  patientId: string;
  day: string;
  isToday: boolean;
  symptoms: readonly PlanSymptom[];
  answered: Readonly<Record<string, number>>;
  initialNote: string;
  night: DayWearableNight | null;
};

function toSeverities(answered: Readonly<Record<string, number>>): Record<string, Severity> {
  return Object.fromEntries(
    Object.entries(answered).flatMap(([code, value]) => (isSeverity(value) ? [[code, value]] : [])),
  );
}

/**
 * "Today's check-in" from the Today artboard: one question at a time with Back / Next, an optional
 * note, and Submit once every question has an answer. Nothing is saved until Submit.
 */
export function CheckInCard({ patientId, day, isToday, symptoms, answered, initialNote, night }: CheckInCardProps) {
  const codes = symptoms.map((symptom) => symptom.code);
  const [answers, setAnswers] = useState(() => toSeverities(answered));
  const [index, setIndex] = useState(() => firstUnansweredIndex(codes, answered));
  const [note, setNote] = useState(initialNote);
  const [startedAt] = useState(() => Date.now());
  const submit = useSubmitCheckin(patientId, day);
  const isUpdate = Object.keys(answered).length > 0;
  const isDirty =
    note.trim() !== initialNote.trim() || codes.some((code) => answers[code] !== answered[code]);

  const doneCount = codes.filter((code) => answers[code] !== undefined).length;
  const remaining = codes.length - doneCount;
  const progress = codes.length > 0 ? doneCount / codes.length : 1;
  const open = symptoms[index];
  const isLast = index === symptoms.length - 1;
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

  const handlePick = (severity: Severity) => {
    if (!open) return;
    setAnswers((current) => ({ ...current, [open.code]: severity }));
    if (!isLast) goTo(index + 1);
  };

  const handleSubmit = () => {
    submit.mutate(
      { answers, note },
      {
        onSuccess: () =>
          router.push({
            pathname: '/checkin-done',
            // Minutes only mean something for a fresh check-in, not an edit.
            params: isUpdate ? { day } : { day, minutes: String(minutesSpent(startedAt, Date.now())) },
          }),
      },
    );
  };

  const submitLabel = submit.isPending
    ? 'Saving…'
    : remaining > 0
      ? `Answer ${remaining} more to submit`
      : !isUpdate
        ? 'Submit check-in'
        : isDirty
          ? 'Update check-in'
          : 'No changes to save';

  if (symptoms.length === 0) {
    return (
      <Card accessibilityLabel="Today’s check-in">
        <Text accessibilityRole="header" style={styles.title}>
          No questions yet
        </Text>
        <Text style={styles.empty}>
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
          <Text style={styles.toGo}>{remaining > 0 ? `${remaining} to go` : 'All answered'}</Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: codes.length, now: doneCount }}
          style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      {open && (
        <Card tone="soft">
          <Text style={styles.step}>{`Question ${index + 1} of ${symptoms.length}`}</Text>
          <Text accessibilityRole="header" style={styles.question}>
            {question}
          </Text>
          {hint && <Text style={styles.hint}>{hint}</Text>}
          <SeverityPicker value={answers[open.code] ?? null} onChange={handlePick} accessibilityLabel={question} />
          <View style={styles.navRow}>
            <StepButton
              direction="back"
              label="Back"
              isDisabled={index === 0}
              onPress={() => goTo(index - 1)}
            />
            <StepButton
              direction="next"
              label="Next"
              isDisabled={isLast || answers[open.code] === undefined}
              onPress={() => goTo(index + 1)}
            />
          </View>
        </Card>
      )}

      <View style={styles.noteGroup}>
        <Text style={styles.noteLabel}>Add a note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Anything you want to remember about today…"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Add a note (optional)"
          style={styles.note}
        />
      </View>

      {submit.isError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {toUserMessage(submit.error)}
        </Text>
      )}

      <PrimaryButton
        label={submitLabel}
        onPress={handleSubmit}
        disabled={remaining > 0 || (isUpdate && !isDirty) || submit.isPending}
        isBusy={submit.isPending}
      />
    </Card>
  );
}

type StepButtonProps = {
  direction: 'back' | 'next';
  label: string;
  isDisabled: boolean;
  onPress: () => void;
};

function StepButton({ direction, label, isDisabled, onPress }: StepButtonProps) {
  const isBack = direction === 'back';
  const icon = (
    <Icon name={isBack ? 'back' : 'chevronRight'} size={22} strokeWidth={2.4} color={colors.accent} />
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={isBack ? 'Previous question' : 'Next question'}
      accessibilityState={{ disabled: isDisabled }}
      style={[styles.stepButton, isDisabled && styles.stepDisabled]}>
      {isBack && icon}
      <Text style={styles.stepLabel}>{label}</Text>
      {!isBack && icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.xs },
  title: { ...type.heading, color: colors.text, flexShrink: 1 },
  toGo: { ...type.label, fontSize: 18, color: colors.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.progressTrack, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  step: { ...type.chip, color: colors.textMuted },
  question: { ...type.question, color: colors.text },
  hint: { ...type.body, fontSize: 17, lineHeight: 24, color: colors.tealDark },
  navRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepButton: {
    minHeight: sizes.minTouchTarget + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  stepDisabled: { opacity: 0.35 },
  stepLabel: { ...type.severity, color: colors.accent },
  noteGroup: { gap: spacing.xs },
  noteLabel: { ...type.chip, color: colors.textMuted },
  note: {
    ...type.body,
    fontSize: 17,
    minHeight: NOTE_MIN_HEIGHT,
    minWidth: sizes.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.optionSmall,
    color: colors.text,
    textAlignVertical: 'top',
  },
  error: { ...type.body, fontSize: 17, color: colors.accentPressed },
  empty: { ...type.body, color: colors.textMuted },
});
