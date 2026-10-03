import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { colors, spacing, type } from '@/theme/tokens';

type PlaceholderScreenProps = {
  title: string;
  children?: ReactNode;
};

/** Stand-in for routes whose real screens land in later plan steps. */
export function PlaceholderScreen({ title, children }: PlaceholderScreenProps) {
  return (
    <Screen background="app">
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>Coming soon.</Text>
        {children}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { ...type.title, color: colors.text },
  body: { ...type.body, color: colors.textMuted },
});
