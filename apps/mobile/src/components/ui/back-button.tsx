import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const SIZE = 48;
const FILLED_ICON = { size: 22, stroke: 2.2 } as const;
const PLAIN_ICON = { size: 28, stroke: 2.4 } as const;
const LINK_ICON = { size: 24, stroke: 2.4 } as const;

type BackButtonProps = {
  /** Defaults to `router.back()`. */
  onPress?: () => void;
  /** `filled` = grey disc (onboarding, forms); `plain` = bare chevron on a white header (Chat). */
  variant?: 'filled' | 'plain';
  /** Renders an accent text link instead, e.g. "‹ Calendar" on the day detail. */
  label?: string;
};

export function BackButton({ onPress = () => router.back(), variant = 'filled', label }: BackButtonProps) {
  if (label) {
    return (
      <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`Back to ${label}`} style={styles.link}>
        <Icon name="back" size={LINK_ICON.size} strokeWidth={LINK_ICON.stroke} color={colors.accent} />
        <Text style={styles.linkLabel}>{label}</Text>
      </Pressable>
    );
  }
  const icon = variant === 'plain' ? PLAIN_ICON : FILLED_ICON;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={[styles.button, variant === 'filled' && styles.filled]}>
      <Icon name="back" size={icon.size} strokeWidth={icon.stroke} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: colors.appBackground },
  link: {
    alignSelf: 'flex-start',
    minHeight: SIZE,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  linkLabel: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 24, color: colors.accent },
});
