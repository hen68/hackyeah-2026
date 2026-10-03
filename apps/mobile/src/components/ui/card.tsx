import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

type CardProps = {
  children: ReactNode;
  /** `soft` = pink panel used inside cards (e.g. the open question on Today). */
  tone?: 'surface' | 'soft';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, tone = 'surface', accessibilityLabel, style }: CardProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, tone === 'soft' ? styles.soft : styles.surface, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md },
  surface: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    boxShadow: '0 6px 20px rgba(74, 31, 44, 0.12)',
  },
  soft: { backgroundColor: colors.softPink, borderRadius: radii.panel },
});
