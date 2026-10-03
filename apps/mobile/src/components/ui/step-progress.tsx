import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, sizes, type } from '@/theme/tokens';

type StepProgressProps = {
  /** 1-based current step. */
  step: number;
  total?: number;
  /** Left of the label, e.g. a back button. */
  leading?: ReactNode;
  /** Right of the label, e.g. "Skip". */
  trailing?: ReactNode;
};

const ONBOARDING_STEPS = 5;
const SLOT_WIDTH = 72;
const ROW_HEIGHT = 48;

export function StepProgress({ step, total = ONBOARDING_STEPS, leading, trailing }: StepProgressProps) {
  const label = `Step ${step} of ${total}`;
  const segments = Array.from({ length: total }, (_, index) => index < step);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.slot, styles.leading]}>{leading}</View>
        {/* The progressbar below announces the same text. */}
        <Text importantForAccessibility="no" accessibilityElementsHidden style={styles.label}>
          {label}
        </Text>
        <View style={[styles.slot, styles.trailing]}>{trailing}</View>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 1, max: total, now: step }}
        style={styles.bars}>
        {segments.map((isDone, index) => (
          <View key={index} style={[styles.bar, isDone ? styles.done : styles.todo]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: ROW_HEIGHT },
  slot: { width: SLOT_WIDTH },
  leading: { alignItems: 'flex-start' },
  trailing: { alignItems: 'flex-end' },
  label: { ...type.label, flex: 1, textAlign: 'center', color: colors.textMuted },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: sizes.progressBarHeight, borderRadius: sizes.progressBarHeight / 2 },
  done: { backgroundColor: colors.accent },
  todo: { backgroundColor: colors.divider },
});
