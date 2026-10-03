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

/** 1–5 severity scale from the Today artboard: numbered dot + label per row. */
export function SeverityPicker({ value, onChange, accessibilityLabel }: SeverityPickerProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.group}>
      {SEVERITY_VALUES.map((severity) => {
        const isSelected = value === severity;
        const label = severityLabels[severity];
        return (
          <Pressable
            key={severity}
            onPress={() => onChange(severity)}
            accessibilityRole="radio"
            accessibilityLabel={`${severity}, ${label}`}
            accessibilityState={{ selected: isSelected }}
            style={[styles.row, isSelected ? styles.selected : styles.unselected]}>
            <View style={[styles.dot, { backgroundColor: severityColors[severity] }]}>
              <Text style={[styles.dotText, { color: severityTextColors[severity] }]}>{severity}</Text>
            </View>
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  row: {
    minHeight: sizes.severityRowHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.optionSmall,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // 1px less padding offsets the thicker border so content doesn't shift on select.
  selected: { borderWidth: 3, borderColor: colors.selectedOutline, paddingHorizontal: spacing.md - 1 },
  unselected: { borderWidth: 2, borderColor: colors.border },
  dot: {
    width: sizes.severityDot,
    height: sizes.severityDot,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { ...type.badge, color: colors.textOnAccent },
  label: { ...type.severity, color: colors.text },
});
