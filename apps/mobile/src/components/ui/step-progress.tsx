import { StyleSheet, Text, View } from 'react-native';

import { colors, sizes, spacing, type } from '@/theme/tokens';

type StepProgressProps = {
  /** 1-based current step. */
  step: number;
  total?: number;
};

const ONBOARDING_STEPS = 5;

export function StepProgress({ step, total = ONBOARDING_STEPS }: StepProgressProps) {
  const label = `Step ${step} of ${total}`;
  const segments = Array.from({ length: total }, (_, index) => index < step);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.bars}>
        {segments.map((isDone, index) => (
          <View key={index} style={[styles.bar, isDone ? styles.done : styles.todo]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, alignItems: 'center' },
  label: { ...type.label, color: colors.textMuted },
  bars: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
  bar: { flex: 1, height: sizes.progressBarHeight, borderRadius: sizes.progressBarHeight / 2 },
  done: { backgroundColor: colors.accent },
  todo: { backgroundColor: colors.divider },
});
