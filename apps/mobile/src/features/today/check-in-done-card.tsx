import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Flower } from '@/components/ui/flower';
import { severityLabel, type PlanSymptom } from '@/features/today/check-in';
import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

const BADGE_SIZE = 64;

type CheckInDoneCardProps = {
  symptoms: readonly PlanSymptom[];
  answered: Readonly<Record<string, number>>;
  /** Reopens the questions, starting at `code` when a chip was tapped. */
  onEdit: (code: string | null) => void;
};

/** Replaces the form on Today once the day's check-in is saved: what was logged, tap to change. */
export function CheckInDoneCard({ symptoms, answered, onEdit }: CheckInDoneCardProps) {
  return (
    <Card accessibilityLabel="Today’s check-in is done">
      <View style={styles.top}>
        <View style={styles.badge}>
          <Flower size={40} />
        </View>
        <View style={styles.text}>
          <Text accessibilityRole="header" style={styles.title}>
            Check-in done
          </Text>
          <Text style={styles.muted}>See you tomorrow. Tap an answer to change it.</Text>
        </View>
      </View>
      <View style={styles.chips}>
        {symptoms
          .filter((symptom) => answered[symptom.code] !== undefined)
          .map((symptom) => (
            <Chip
              key={symptom.code}
              label={`${symptom.label}: ${severityLabel(answered[symptom.code]) ?? ''}`}
              onPress={() => onEdit(symptom.code)}
            />
          ))}
      </View>
      <Pressable onPress={() => onEdit(null)} accessibilityRole="button" style={styles.edit}>
        <Text style={styles.editLabel}>Edit answers</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { ...type.heading, color: colors.text },
  muted: { ...type.body, fontSize: 17, lineHeight: 24, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  edit: { minHeight: sizes.minTouchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  editLabel: { ...type.option, fontSize: 19, color: colors.accent },
});
