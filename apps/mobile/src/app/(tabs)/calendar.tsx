import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Flower } from '@/components/ui/flower';
import { Icon } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import {
  buildMonthGrid,
  dateOf,
  monthName,
  shiftMonth,
  summarizeMonth,
  type MonthRef,
} from '@/features/calendar/month-grid';
import { DAY_STATUS_LABELS } from '@/features/today/check-in';
import { getCalendarMonth, type CalendarDay } from '@/lib/api/calendar';
import { toLocalDateString } from '@/lib/dates';
import { toUserMessage } from '@/lib/errors';
import { colors, dayStatusColors, radii, spacing, type } from '@/theme/tokens';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const CELL_HEIGHT = 56;
const NAV_SIZE = 48;
const FUTURE_TEXT = '#9AA0A6';
const LEGEND_SWATCH = 20;
const CELL_FLOWER = 16;
/** Lightest first: the month reads as a garden, never as a row of warnings. */
const TILE_STATUSES = ['good', 'okay', 'hard'] as const;

function currentMonth(): MonthRef {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Artboard Calendar (log mode). */
export default function CalendarScreen() {
  const [month, setMonth] = useState(currentMonth);
  const today = toLocalDateString();
  const firstDay = dateOf(month, 1);
  const isCurrentMonth = firstDay === dateOf(currentMonth(), 1);
  // Shares the ['calendar'] prefix that check-in saves invalidate.
  const query = useQuery({ queryKey: ['calendar', firstDay], queryFn: () => getCalendarMonth(firstDay) });
  const byDate = new Map((query.data ?? []).map((row) => [row.day, row]));
  const name = monthName(month);
  const title = `${name} ${month.year}`;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Calendar
        </Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        {query.data && <SummaryCard title={isCurrentMonth ? `${name} so far` : name} days={query.data} today={today} />}

        <View accessibilityLabel={title} style={styles.card}>
          <View style={styles.monthRow}>
            <NavButton direction="back" label="Previous month" onPress={() => setMonth((m) => shiftMonth(m, -1))} />
            <Text accessibilityRole="header" style={styles.monthTitle}>
              {title}
            </Text>
            <NavButton
              direction="chevronRight"
              label="Next month"
              isDisabled={isCurrentMonth}
              onPress={() => setMonth((m) => shiftMonth(m, 1))}
            />
          </View>

          <View style={styles.week}>
            {WEEKDAYS.map((weekday) => (
              <Text key={weekday} style={styles.weekday}>
                {weekday}
              </Text>
            ))}
          </View>

          {query.error ? (
            <View style={styles.status}>
              <Text accessibilityRole="alert" style={styles.errorText}>
                {toUserMessage(query.error)}
              </Text>
              <PrimaryButton label="Try again" onPress={() => query.refetch()} />
            </View>
          ) : !query.data ? (
            <ActivityIndicator accessibilityLabel="Loading the month" color={colors.accent} style={styles.status} />
          ) : (
            buildMonthGrid(month.year, month.month).map((week, index) => (
              <View key={index} style={styles.week}>
                {week.map((dayNumber, cell) =>
                  dayNumber === null ? (
                    <View key={cell} style={styles.cell} />
                  ) : (
                    <DayCell
                      key={cell}
                      date={dateOf(month, dayNumber)}
                      dayNumber={dayNumber}
                      monthLabel={name}
                      row={byDate.get(dateOf(month, dayNumber))}
                      today={today}
                    />
                  ),
                )}
              </View>
            ))
          )}

          <View style={styles.legend}>
            {TILE_STATUSES.map((status) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: dayStatusColors[status] }]} />
                <Text style={styles.legendLabel}>{DAY_STATUS_LABELS[status]}</Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <Flower size={CELL_FLOWER + 4} />
              <Text style={styles.legendLabel}>Checked in</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, styles.swatchOutline]} />
              <Text style={styles.legendLabel}>Not logged</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={styles.bleeding}>●</Text>
              <Text style={styles.legendLabel}>Bleeding</Text>
            </View>
          </View>
          <Text style={styles.hint}>Tap a day to see everything from that day.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryCard({ title, days, today }: { title: string; days: readonly CalendarDay[]; today: string }) {
  const summary = summarizeMonth(days, today);
  return (
    <View accessibilityLabel={title} style={styles.card}>
      <View style={styles.summaryHeading}>
        <Text accessibilityRole="header" style={styles.summaryTitle}>
          {title}
        </Text>
        <Text style={styles.muted}>{`${summary.logged} of ${summary.elapsed} days in your garden`}</Text>
      </View>
      <View style={styles.tiles}>
        {TILE_STATUSES.map((status) => (
          <View
            key={status}
            accessible
            accessibilityLabel={`${summary[status]} ${DAY_STATUS_LABELS[status].toLowerCase()}s`}
            style={[styles.tile, { backgroundColor: dayStatusColors[status] }]}>
            <Text style={styles.tileCount}>{summary[status]}</Text>
            <Text style={styles.tileLabel}>{`${DAY_STATUS_LABELS[status].toLowerCase()}s`}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type DayCellProps = {
  date: string;
  dayNumber: number;
  monthLabel: string;
  row: CalendarDay | undefined;
  today: string;
};

function DayCell({ date, dayNumber, monthLabel, row, today }: DayCellProps) {
  if (date > today) {
    return (
      <View style={styles.cell}>
        <Text style={[styles.dayNumber, styles.future]}>{dayNumber}</Text>
      </View>
    );
  }
  const status = row?.status ?? 'none';
  const isToday = date === today;
  const hasBleeding = row?.has_bleeding ?? false;
  const hasCheckin = row?.has_checkin ?? false;
  const label = [
    `${dayNumber} ${monthLabel}`,
    status !== 'none' ? DAY_STATUS_LABELS[status].toLowerCase() : hasCheckin ? 'checked in' : 'nothing logged',
    hasBleeding ? 'bleeding' : null,
    isToday ? 'today' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/day/[date]', params: { date, from: 'calendar' } })}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.cell,
        styles.dayCell,
        { backgroundColor: dayStatusColors[status] },
        !hasCheckin && styles.notLogged,
        isToday && styles.today,
      ]}>
      <Text style={[styles.dayNumber, isToday && styles.todayNumber]}>{dayNumber}</Text>
      {(hasCheckin || hasBleeding) && (
        <View style={styles.marks}>
          {hasCheckin && <Flower size={CELL_FLOWER} />}
          {hasBleeding && <Text style={styles.bleeding}>●</Text>}
        </View>
      )}
    </Pressable>
  );
}

type NavButtonProps = {
  direction: 'back' | 'chevronRight';
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
};

function NavButton({ direction, label, onPress, isDisabled = false }: NavButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={[styles.nav, isDisabled && styles.navDisabled]}>
      <Icon name={direction} size={22} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.appBackground },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...type.title, fontSize: 32, lineHeight: 38, color: colors.text, paddingHorizontal: spacing.xxs },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 18, gap: spacing.sm },
  summaryHeading: { gap: spacing.xxs },
  summaryTitle: { ...type.heading, color: colors.text },
  muted: { ...type.body, fontSize: 19, color: colors.textMuted },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: radii.option, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center' },
  tileCount: { ...type.title, fontSize: 32, lineHeight: 36, color: colors.text },
  tileLabel: { ...type.label, fontFamily: type.heading.fontFamily, color: colors.text, textAlign: 'center' },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthTitle: { ...type.heading, fontSize: 22, color: colors.text },
  nav: {
    width: NAV_SIZE,
    height: NAV_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.appBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.35 },
  week: { flexDirection: 'row', gap: spacing.xxs },
  weekday: { ...type.chip, fontSize: 15, flex: 1, textAlign: 'center', color: colors.textMuted },
  cell: { flex: 1, height: CELL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  notLogged: { borderStyle: 'dashed', borderColor: colors.border },
  today: { borderWidth: 3, borderStyle: 'solid', borderColor: colors.selectedOutline },
  marks: { flexDirection: 'row', alignItems: 'center', gap: 2, height: CELL_FLOWER },
  dayNumber: { ...type.severity, lineHeight: 22, color: colors.text },
  todayNumber: { fontFamily: type.heading.fontFamily },
  future: { color: FUTURE_TEXT },
  bleeding: { fontSize: 12, lineHeight: 14, color: colors.accentPressed },
  status: { minHeight: 240, justifyContent: 'center', gap: spacing.md },
  errorText: { ...type.body, color: colors.text, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, paddingTop: spacing.xs },
  legendItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: LEGEND_SWATCH, height: LEGEND_SWATCH, borderRadius: 6 },
  swatchOutline: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  legendLabel: { ...type.label, color: colors.text },
  hint: { ...type.body, color: colors.textMuted },
});
