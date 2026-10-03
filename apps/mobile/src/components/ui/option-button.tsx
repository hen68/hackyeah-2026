import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

type OptionButtonProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

const CHECK_ICON_SIZE = 16;
const CHECK_STROKE_WIDTH = 3;
const PRESSED_SCALE = 0.98;

/** Single answer row from the onboarding questions (OnbAge, OnbPeriod, OnbHRT). */
export function OptionButton({ label, isSelected, onPress }: OptionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [styles.option, isSelected ? styles.selected : styles.unselected, pressed && styles.pressed]}>
      <Text style={styles.label}>{label}</Text>
      {isSelected && (
        <View style={styles.check}>
          <Icon name="check" size={CHECK_ICON_SIZE} color={colors.textOnAccent} strokeWidth={CHECK_STROKE_WIDTH} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: sizes.optionHeight,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderRadius: radii.option,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.softPinkStrong },
  unselected: { borderColor: colors.border, backgroundColor: colors.surface },
  pressed: {
    borderColor: colors.pressedOutline,
    backgroundColor: colors.softPinkStrong,
    transform: [{ scale: PRESSED_SCALE }],
  },
  label: { ...type.option, color: colors.text, flexShrink: 1 },
  check: {
    width: sizes.checkBadge,
    height: sizes.checkBadge,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
