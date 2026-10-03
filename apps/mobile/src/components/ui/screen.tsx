import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  /** `app` = grey app background (tabs), `surface` = white (onboarding, forms). */
  background?: 'app' | 'surface';
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
};

const BACKGROUNDS = { app: colors.appBackground, surface: colors.surface } as const;
const DEFAULT_EDGES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

export function Screen({ children, background = 'surface', edges = DEFAULT_EDGES, style }: ScreenProps) {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.screen, { backgroundColor: BACKGROUNDS[background] }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
});
