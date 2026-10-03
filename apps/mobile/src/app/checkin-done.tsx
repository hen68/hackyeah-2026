import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Flower } from '@/components/ui/flower';
import { Icon } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useAuth } from '@/features/auth/auth-provider';
import { useCheckinDays } from '@/features/today/hooks';
import { currentStreak, monthGarden } from '@/features/today/streak';
import { formatLongDate, parseLocalDate, toLocalDateString } from '@/lib/dates';
import { colors, radii, spacing, type } from '@/theme/tokens';

const HALO_SIZE = 176;
const GARDEN_COLUMNS = 8;
const GARDEN_FLOWER = 26;
const GARDEN_DOT = 10;
/** Soft pink disc behind each bloomed day so check-ins stand out from the empty plots. */
const BLOOM_SIZE = 34;

function goHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Artboard "Check-in done!": shown after Submit on Today. */
export default function CheckInDoneScreen() {
  const { session, profile } = useAuth();
  const patientId = session?.user.id ?? '';
  const params = useLocalSearchParams<{ day?: string; minutes?: string }>();
  const today = toLocalDateString();
  const day = params.day && parseLocalDate(params.day) ? params.day : today;
  const parsedMinutes = Number.parseInt(params.minutes ?? '', 10);
  const minutes = Number.isFinite(parsedMinutes) ? Math.max(1, parsedMinutes) : null;
  const isToday = day === today;

  const checkinDays = useCheckinDays(patientId).data ?? [day];
  const streak = currentStreak(checkinDays, today);
  const garden = monthGarden(checkinDays, day);
  const name = profile?.display_name?.trim();
  const thanks = name ? `Thank you, ${name}.` : 'Thank you.';
  const message = isToday
    ? `${thanks} Today’s flower is now in your garden.`
    : `${thanks} ${formatLongDate(day)} is saved in your garden.`;
  const noteDays = checkinDays.length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top']} style={styles.top}>
          <View style={styles.halo}>
            <Flower size={96} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Check-in done!
          </Text>
          <Text style={styles.message}>{message}</Text>
        </SafeAreaView>

        <View style={styles.body}>
          <View style={styles.stats}>
            <View accessible style={styles.stat}>
              <Text style={styles.statValue}>{streak.count}</Text>
              <Text style={styles.statLabel}>{streak.count === 1 ? 'day in a row' : 'days in a row'}</Text>
            </View>
            {minutes !== null && (
              <View accessible style={styles.stat}>
                <Text style={styles.statValue}>{`${minutes} min`}</Text>
                <Text style={styles.statLabel}>well spent today</Text>
              </View>
            )}
          </View>

          <View
            accessible
            accessibilityLabel={`Your ${garden.monthLabel} garden: ${garden.bloomed} of ${garden.flowers.length} flowers`}
            style={styles.card}>
            <View style={styles.gardenHeading}>
              <Text style={styles.gardenTitle}>{`Your ${garden.monthLabel} garden`}</Text>
              <Text style={styles.gardenCount}>{`${garden.bloomed} of ${garden.flowers.length} flowers`}</Text>
            </View>
            <View style={styles.garden}>
              {garden.flowers.map((isBloomed, index) => (
                <View key={index} style={styles.plot}>
                  {isBloomed ? (
                    <View style={styles.bloom}>
                      <Flower size={GARDEN_FLOWER} />
                    </View>
                  ) : (
                    <View style={styles.seed} />
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.doctor}>
            <Icon name="document" size={24} color={colors.lavender} />
            <Text style={styles.doctorText}>
              {`Every check-in makes the report for your doctor clearer. You have ${noteDays} ${
                noteDays === 1 ? 'day' : 'days'
              } of check-ins ready to share.`}
            </Text>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <PrimaryButton label="Back to Home" onPress={goHome} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.appBackground },
  scroll: {
    flexGrow: 1,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.heroGradient[0]} 0%, ${colors.appBackground} 60%)`,
  },
  top: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, gap: spacing.sm },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(74, 31, 44, 0.15)',
    marginBottom: spacing.sm,
  },
  title: { ...type.title, fontSize: 36, lineHeight: 42, color: colors.text, textAlign: 'center' },
  message: { ...type.body, fontSize: 20, lineHeight: 28, color: colors.heroText, textAlign: 'center' },
  body: { padding: spacing.lg, gap: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.panel, padding: spacing.md, gap: 2 },
  statValue: { ...type.title, fontSize: 32, lineHeight: 38, color: colors.text },
  statLabel: { ...type.label, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, gap: spacing.md },
  gardenHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  gardenTitle: { ...type.heading, fontSize: 22, lineHeight: 28, color: colors.text, flexShrink: 1 },
  gardenCount: { ...type.label, color: colors.textMuted, paddingTop: 3 },
  garden: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xs },
  plot: { width: `${100 / GARDEN_COLUMNS}%`, height: BLOOM_SIZE, alignItems: 'center', justifyContent: 'center' },
  bloom: {
    width: BLOOM_SIZE,
    height: BLOOM_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seed: { width: GARDEN_DOT, height: GARDEN_DOT, borderRadius: radii.pill, backgroundColor: colors.divider },
  doctor: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.panel,
    padding: spacing.lg,
  },
  doctorText: { ...type.body, flex: 1, color: colors.text },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
