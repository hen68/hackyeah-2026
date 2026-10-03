import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useAuth } from '@/features/auth/auth-provider';
import { answeredSeverities, greeting } from '@/features/today/check-in';
import { CheckInCard } from '@/features/today/check-in-card';
import { useCheckinDays, useDay, usePlanSymptoms } from '@/features/today/hooks';
import { StreakCard } from '@/features/today/streak-card';
import { watchSummary } from '@/features/today/watch';
import { formatLongDate, parseLocalDate, toLocalDateString } from '@/lib/dates';
import { toUserMessage } from '@/lib/errors';
import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

const HERO_TOP_PADDING = 24;
const MIC_SIZE = 64;
const WATCH_BADGE_SIZE = 48;

/** `?date=` from Day detail edits a past day; missing, malformed or future dates mean today. */
function resolveDay(param: string | undefined, today: string): string {
  return param && parseLocalDate(param) && param <= today ? param : today;
}

/** Artboard Today (Home). */
export default function TodayScreen() {
  const { session, profile } = useAuth();
  // Only rendered inside the tabs gate, which requires a session.
  const patientId = session?.user.id ?? '';
  const params = useLocalSearchParams<{ date?: string }>();
  const today = toLocalDateString();
  const day = resolveDay(params.date, today);
  const isToday = day === today;

  const dayQuery = useDay(day);
  const plan = usePlanSymptoms(patientId);
  const checkinDays = useCheckinDays(patientId);
  // Background refetch errors keep the card (and the unsaved note) on screen.
  const error = (!dayQuery.data && dayQuery.error) || (!plan.symptoms && plan.error) || null;
  const night = dayQuery.data?.wearable_nights[0] ?? null;
  const summary = night ? watchSummary(night) : null;
  const answered = answeredSeverities(dayQuery.data);
  const remaining = (plan.symptoms ?? []).filter((symptom) => answered[symptom.code] === undefined).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} contentInsetAdjustmentBehavior="never">
      <SafeAreaView edges={['top']} style={styles.hero}>
        <View style={styles.heading}>
          <Text style={styles.date}>{formatLongDate(day)}</Text>
          <Text accessibilityRole="header" style={styles.greeting}>
            {greeting(new Date().getHours(), profile?.display_name ?? null)}
          </Text>
        </View>
        {isToday && checkinDays.data && (
          <StreakCard checkinDays={checkinDays.data} today={today} remaining={remaining} />
        )}
        {error ? (
          <View style={styles.status}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {toUserMessage(error)}
            </Text>
            <PrimaryButton label="Try again" onPress={() => Promise.all([dayQuery.refetch(), plan.refetch()])} />
          </View>
        ) : dayQuery.data && plan.symptoms ? (
          <CheckInCard
            key={day}
            patientId={patientId}
            day={day}
            isToday={isToday}
            symptoms={plan.symptoms}
            answered={answered}
            initialNote={dayQuery.data.checkin?.note ?? ''}
            night={night}
          />
        ) : (
          <ActivityIndicator accessibilityLabel="Loading your day" color={colors.accent} style={styles.status} />
        )}
      </SafeAreaView>

      <View style={styles.body}>
        {!isToday && (
          <Pressable
            onPress={() => router.setParams({ date: undefined })}
            accessibilityRole="button"
            style={styles.backToToday}>
            <Text style={styles.link}>Back to today</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push('/chat')}
          accessibilityRole="button"
          accessibilityLabel="Anything else? Speak or type how you feel"
          style={styles.chatCard}>
          <View style={styles.mic}>
            <Icon name="mic" size={30} color={colors.textOnAccent} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.chatTitle}>Anything else?</Text>
            <Text style={styles.muted}>Speak or type how you feel</Text>
          </View>
        </Pressable>

        {summary && (
          <Pressable
            onPress={() => router.push({ pathname: '/day/[date]', params: { date: day } })}
            accessibilityRole="button"
            accessibilityLabel={`Last night from your watch: ${summary}. See this day`}
            style={styles.watchRow}>
            <View style={styles.watchBadge}>
              <Icon name="watch" size={26} color={colors.tealDark} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.watchLabel}>Last night, from your watch</Text>
              <Text style={styles.watchSummary}>{summary}</Text>
            </View>
            <Icon name="chevronRight" size={22} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.appBackground },
  scroll: { flexGrow: 1 },
  hero: {
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.heroGradient[0]} 0%, ${colors.heroGradient[1]} 100%)`,
    paddingHorizontal: spacing.lg,
    paddingTop: HERO_TOP_PADDING,
    paddingBottom: spacing.xl,
    gap: 18,
  },
  heading: { gap: spacing.xxs, paddingHorizontal: spacing.xxs },
  date: { ...type.label, fontSize: 18, color: colors.heroText },
  greeting: { ...type.title, fontSize: 30, lineHeight: 35, color: colors.text },
  status: { minHeight: 200, justifyContent: 'center', gap: spacing.md },
  errorText: { ...type.body, color: colors.text, textAlign: 'center' },
  body: { padding: spacing.lg, paddingTop: spacing.xl, gap: 18 },
  backToToday: { minHeight: sizes.minTouchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { ...type.option, fontSize: 19, color: colors.accent },
  chatCard: {
    minHeight: 84,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingLeft: 10,
    paddingRight: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mic: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  chatTitle: { ...type.option, fontFamily: type.heading.fontFamily, color: colors.text },
  muted: { ...type.label, fontFamily: type.body.fontFamily, color: colors.textMuted },
  watchRow: {
    minHeight: 76,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  watchBadge: {
    width: WATCH_BADGE_SIZE,
    height: WATCH_BADGE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchLabel: { ...type.label, color: colors.textMuted },
  watchSummary: { ...type.severity, fontFamily: type.heading.fontFamily, lineHeight: 26, color: colors.text },
});
