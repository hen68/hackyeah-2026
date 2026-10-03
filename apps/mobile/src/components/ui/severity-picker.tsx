import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  radii,
  SEVERITY_VALUES,
  severityColors,
  severityLabels,
  severityTextColors,
  sizes,
  spacing,
  type,
  type Severity,
} from '@/theme/tokens';

type SeverityPickerProps = {
  value: Severity | null;
  onChange: (value: Severity) => void;
  /** Names the group for screen readers, e.g. "Hot flushes". */
  accessibilityLabel: string;
};

const PRESSED_SCALE = 0.96;

/** 1–5 severity scale as one row of numbered tiles, with the scale ends labelled underneath. */
export function SeverityPicker({ value, onChange, accessibilityLabel }: SeverityPickerProps) {
  return (
    <View style={styles.group}>
      <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.row}>
        {SEVERITY_VALUES.map((severity) => {
          const isSelected = value === severity;
          return (
            <Pressable
              key={severity}
              onPress={() => onChange(severity)}
              accessibilityRole="radio"
              accessibilityLabel={`${severity}, ${severityLabels[severity]}`}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.tile,
                isSelected ? styles.selected : styles.unselected,
                pressed && styles.pressed,
              ]}>
              <View style={[styles.dot, { backgroundColor: severityColors[severity] }]}>
                <Text style={[styles.dotText, { color: severityTextColors[severity] }]}>{severity}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.ends}>
        <Text style={styles.end}>{severityLabels[1]}</Text>
        <Text style={styles.end}>{severityLabels[5]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.xs },
  tile: {
    flex: 1,
    height: sizes.severityTileHeight,
    borderRadius: radii.optionSmall,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderWidth: 3, borderColor: colors.selectedOutline },
  unselected: { borderWidth: 2, borderColor: colors.border },
  pressed: {
    borderColor: colors.pressedOutline,
    backgroundColor: colors.softPinkStrong,
    transform: [{ scale: PRESSED_SCALE }],
  },
  dot: {
    width: sizes.severityDot,
    height: sizes.severityDot,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { ...type.severity, color: colors.textOnAccent },
  ends: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xxs },
  end: { ...type.label, color: colors.textMuted },
});
