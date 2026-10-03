import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { colors, radii, spacing, type } from '@/theme/tokens';

const BADGE_SIZE = 64;

/** Replaces the form on Today once the day is checked in; the details live on Day detail. */
export function CheckInDoneCard({ day }: { day: string }) {
  return (
    <Card accessibilityLabel="Today’s check-in is done">
      <View style={styles.top}>
        <View style={styles.badge}>
          <Icon name="check" size={34} strokeWidth={3} color={colors.textOnAccent} />
        </View>
        <View style={styles.text}>
          <Text accessibilityRole="header" style={styles.title}>
            Check-in done
          </Text>
          <Text style={styles.muted}>See you tomorrow.</Text>
        </View>
      </View>
      <PrimaryButton
        label="See today’s check-in"
        accessibilityHint="Opens today in the calendar"
        onPress={() => router.push({ pathname: '/day/[date]', params: { date: day, from: 'calendar' } })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { ...type.heading, color: colors.text },
  muted: { ...type.body, fontSize: 17, lineHeight: 24, color: colors.textMuted },
});
