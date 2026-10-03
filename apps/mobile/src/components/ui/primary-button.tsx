import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  /** Disabled renders the grey "Choose an answer" style; pass that copy as `label`. */
  disabled?: boolean;
  /** Announced to screen readers while work is in progress. */
  isBusy?: boolean;
  accessibilityHint?: string;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  isBusy = false,
  accessibilityHint,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, busy: isBusy }}
      style={({ pressed }) => [styles.button, disabled ? styles.disabled : pressed ? styles.pressed : styles.enabled]}>
      <Text style={[styles.label, disabled ? styles.disabledLabel : styles.enabledLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: sizes.primaryButtonHeight,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  enabled: { backgroundColor: colors.accent },
  pressed: { backgroundColor: colors.accentPressed },
  disabled: { backgroundColor: colors.divider },
  label: { ...type.button, textAlign: 'center' },
  enabledLabel: { color: colors.textOnAccent },
  disabledLabel: { color: colors.textMuted, fontSize: 20 },
});
