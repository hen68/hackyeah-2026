import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

type ChipProps = {
  label: string;
  onPress: () => void;
  isSelected?: boolean;
};

export function Chip({ label, onPress, isSelected = false }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      style={[styles.chip, isSelected ? styles.selected : styles.unselected]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: sizes.chipHeight,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.softPinkStrong },
  unselected: { borderColor: colors.border, backgroundColor: colors.surface },
  label: { ...type.chip, color: colors.text },
});
