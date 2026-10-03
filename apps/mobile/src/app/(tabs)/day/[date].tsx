import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { Icon } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { DAY_STATUS_LABELS, dayStatus, isSeverity, severityLabel } from '@/features/today/check-in';
import { useDay, useSymptomCatalog } from '@/features/today/hooks';
import { watchRows } from '@/features/today/watch';
import type { DayData } from '@/lib/api/day';
import { formatClockTime, formatLongDate, parseLocalDate, toLocalDateString } from '@/lib/dates';
import { toUserMessage } from '@/lib/errors';
import { colors, dayStatusColors, radii, severityColors, sizes, spacing, type } from '@/theme/tokens';

const DOT_SIZE = 12;
const UNRATED_DOT = '#C9CDD2';
const ROW_LABEL = '#3F4650';

type LoggedRow = { key: string; label: string; value: string; dot: string };

function loggedRows(day: DayData, labelFor: (code: string) => string): LoggedRow[] {
  const entries = day.entries.map((entry, index) => ({
    key: `entry-${index}`,
    label: entry.symptom_code ? labelFor(entry.symptom_code) : (entry.custom_label ?? ''),
    value: severityLabel(entry.severity) ?? '',
    dot: isSeverity(entry.severity) ? severityColors[entry.severity] : UNRATED_DOT,
  }));
  const observations = day.observations.map((observation) => ({
    key: observation.id,
    label: observation.symptom_code ? labelFor(observation.symptom_code) : (observation.custom_label ?? ''),
    value: observation.severity !== null ? (severityLabel(observation.severity) ?? '') : 'Mentioned',
    dot:
      observation.severity !== null && isSeverity(observation.severity)
        ? severityColors[observation.severity]
        : UNRATED_DOT,
  }));
  return [...entries, ...observations];
}

/** Artboard DayDetail. */
export default function DayDetailScreen() {
  const { date = '', from } = useLocalSearchParams<{ date: string; from?: string }>();
  const isValid = parseLocalDate(date) !== null;
  const isFuture = date > toLocalDateString();
  const dayQuery = useDay(date);
  const catalog = useSymptomCatalog();

  const labelFor = (code: string) => catalog.data?.find((item) => item.code === code)?.label ?? code;
  const day = dayQuery.data;
  const status = dayStatus(day?.entries.map((entry) => entry.severity) ?? []);
  const night = day?.wearable_nights[0];
  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/calendar'));

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackButton label={from === 'calendar' ? 'Calendar' : 'Back'} onPress={goBack} />
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>
            {isValid ? formatLongDate(date) : 'Day not found'}
          </Text>
          {day && (
            <Text style={[styles.pill, { backgroundColor: dayStatusColors[status] }]}>{DAY_STATUS_LABELS[status]}</Text>
          )}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        {!isValid ? null : dayQuery.error ? (
          <View style={styles.status}>
            <Text accessibilityRole="alert" style={styles.text}>
              {toUserMessage(dayQuery.error)}
            </Text>
            <PrimaryButton label="Try again" onPress={() => dayQuery.refetch()} />
          </View>
        ) : !day ? (
          <ActivityIndicator accessibilityLabel="Loading this day" color={colors.accent} style={styles.status} />
        ) : (
          <>
            <Section title="What you logged">
              {loggedRows(day, labelFor).map((row) => (
                <Row key={row.key} label={row.label}>
                  <View style={styles.valueWithDot}>
                    <View style={[styles.dot, { backgroundColor: row.dot }]} />
                    <Text style={styles.value}>{row.value}</Text>
                  </View>
                </Row>
              ))}
              {day.entries.length + day.observations.length === 0 && (
                <Text style={styles.empty}>Nothing logged for this day.</Text>
              )}
            </Section>

            {night && watchRows(night).length > 0 && (
              <Section title="From your watch" icon>
                {watchRows(night).map((row) => (
                  <Row key={row.label} label={row.label}>
                    <Text style={styles.value}>{row.value}</Text>
                  </Row>
                ))}
              </Section>
            )}

            {(day.checkin?.note || day.chat_messages.length > 0) && (
              <Section title="In your words">
                {day.checkin?.note && (
                  <View style={styles.words}>
                    <Text style={styles.quote}>{`“${day.checkin.note}”`}</Text>
                    <Text style={styles.meta}>Your note</Text>
                  </View>
                )}
                {day.chat_messages.map((message) => (
                  <View key={message.id} style={styles.words}>
                    <Text style={styles.quote}>{`“${message.content}”`}</Text>
                    <Text style={styles.meta}>{`Said to Digna at ${formatClockTime(message.created_at)}`}</Text>
                  </View>
                ))}
              </Section>
            )}

            {!isFuture && (
              <Pressable
                onPress={() => router.navigate({ pathname: '/', params: { date } })}
                accessibilityRole="button"
                style={styles.change}>
                <Text style={styles.changeLabel}>Change this day</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, icon = false, children }: { title: string; icon?: boolean; children: ReactNode }) {
  return (
    <View accessibilityLabel={title} style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && <Icon name="watch" color={colors.tealDark} />}
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.appBackground },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 10,
  },
  headerText: { paddingHorizontal: spacing.sm, gap: 10 },
  title: { ...type.title, fontSize: 30, lineHeight: 35, color: colors.text },
  pill: {
    ...type.label,
    fontSize: 18,
    fontFamily: type.heading.fontFamily,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  status: { minHeight: 200, justifyContent: 'center', gap: spacing.md },
  text: { ...type.body, color: colors.text, textAlign: 'center' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 6 },
  sectionTitle: { ...type.heading, fontSize: 22, color: colors.text },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rowLabel: { ...type.body, fontSize: 19, color: ROW_LABEL, flexShrink: 1 },
  valueWithDot: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: radii.pill },
  value: { ...type.severity, fontFamily: type.heading.fontFamily, color: colors.text, textAlign: 'right' },
  empty: { ...type.body, color: colors.textMuted, paddingVertical: spacing.sm },
  words: { gap: spacing.xxs, paddingVertical: spacing.xs },
  quote: { ...type.body, fontSize: 20, lineHeight: 29, color: colors.text },
  meta: { ...type.label, fontFamily: type.body.fontFamily, color: colors.textMuted },
  change: {
    minHeight: 60,
    minWidth: sizes.minTouchTarget,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeLabel: { ...type.severity, color: colors.text },
});
