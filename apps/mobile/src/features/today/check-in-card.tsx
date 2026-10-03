import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { SeverityPicker } from '@/components/ui/severity-picker';
import { isSeverity, nextUnanswered, questionFor, severityLabel, type PlanSymptom } from '@/features/today/check-in';
import { useNoteAutosave, useSaveEntry } from '@/features/today/hooks';
import { watchHint } from '@/features/today/watch';
import { NOTE_MAX_LENGTH } from '@/lib/api/checkins';
import type { DayWearableNight } from '@/lib/api/day';
import { toUserMessage } from '@/lib/errors';
import { colors, radii, sizes, spacing, type, type Severity } from '@/theme/tokens';

const PROGRESS_TRACK = '#F1D3DB';
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

/** "How is today?" card from the Today artboard: one question at a time, chips to edit, note. */
export function CheckInCard({ patientId, day, isToday, symptoms, answered, initialNote, night }: CheckInCardProps) {
  const codes = symptoms.map((symptom) => symptom.code);
  const [openCode, setOpenCode] = useState(() => nextUnanswered(codes, answered));
  const saveEntry = useSaveEntry(patientId, day);
  const { note, setNote, isError: isNoteError } = useNoteAutosave(patientId, day, initialNote);

  const doneCount = codes.filter((code) => answered[code] !== undefined).length;
  const progress = codes.length > 0 ? doneCount / codes.length : 0;
  const open = symptoms.find((symptom) => symptom.code === openCode);
  const openValue = open ? answered[open.code] : undefined;
  const hint = open ? watchHint(open.code, night) : null;
  const question = open ? questionFor(open.code, open.label) : '';

  const handlePick = (severity: Severity) => {
    if (!open) return;
    const failedCode = open.code;
    // Re-open the question on failure so it can be answered again.
    saveEntry.mutate({ symptomCode: failedCode, severity }, { onError: () => setOpenCode(failedCode) });
    setOpenCode(nextUnanswered(codes, { ...answered, [open.code]: severity }, open.code));
  };

  return (
    <Card accessibilityLabel={isToday ? 'Log today' : 'Change this day'}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            {isToday ? 'How is today?' : 'How was this day?'}
          </Text>
          <Text style={styles.done}>{`${doneCount} of ${codes.length} done`}</Text>
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
          <Text style={styles.question}>{question}</Text>
          {hint && <Text style={styles.hint}>{hint}</Text>}
          <SeverityPicker
            value={openValue !== undefined && isSeverity(openValue) ? openValue : null}
            onChange={handlePick}
            accessibilityLabel={question}
          />
        </Card>
      )}

      {saveEntry.isError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {toUserMessage(saveEntry.error)}
        </Text>
      )}

      {doneCount > 0 && (
        <View style={styles.chips}>
          {symptoms
            .filter((symptom) => answered[symptom.code] !== undefined)
            .map((symptom) => (
              <Chip
                key={symptom.code}
                label={`${symptom.label}: ${severityLabel(answered[symptom.code]) ?? ''}`}
                isSelected={symptom.code === openCode}
                onPress={() => setOpenCode(symptom.code)}
              />
            ))}
        </View>
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
        {isNoteError && (
          <Text accessibilityRole="alert" style={styles.error}>
            We couldn’t save your note. Keep typing and we’ll try again.
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.xs },
  title: { ...type.heading, color: colors.text, flexShrink: 1 },
  done: { ...type.label, fontSize: 18, color: colors.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: PROGRESS_TRACK, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  question: { ...type.question, color: colors.text },
  hint: { ...type.body, fontSize: 17, lineHeight: 24, color: colors.tealDark },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
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
});
