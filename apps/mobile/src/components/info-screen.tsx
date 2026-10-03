import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { colors, spacing, type } from '@/theme/tokens';

export type InfoSection = { heading: string; body: string };

type InfoScreenProps = {
  title: string;
  sections: readonly InfoSection[];
};

/** Static text page (Privacy, Help) opened from Profile. */
export function InfoScreen({ title, sections }: InfoScreenProps) {
  return (
    <Screen background="app" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton />
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>
              {section.heading}
            </Text>
            <Text style={styles.text}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  title: { ...type.heading, color: colors.text, flexShrink: 1 },
  body: { gap: spacing.xl, paddingBottom: spacing.xxl },
  section: { gap: spacing.xs },
  heading: { ...type.label, color: colors.text },
  text: { ...type.body, color: colors.textMuted },
});
