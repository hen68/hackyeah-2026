import { StyleSheet, Text, View } from 'react-native';

import { Flower } from '@/components/ui/flower';
import { Icon } from '@/components/ui/icon';
import { minutesLeft } from '@/features/today/check-in';
import { currentStreak, daysInARow, lastWeek } from '@/features/today/streak';
import { colors, radii, spacing, type } from '@/theme/tokens';

const BADGE_SIZE = 56;
const DAY_DOT = 36;

type StreakCardProps = {
  checkinDays: readonly string[];
  today: string;
  /** Questions still open today, for the time estimate. */
  remaining: number;
};

function subtitle(count: number, isTodayDone: boolean, remaining: number): string {
  if (isTodayDone) return 'Today’s flower is in your garden.';
  const time = `About ${minutesLeft(remaining)} min.`;
  return count > 0 ? `Today makes ${count + 1}. ${time}` : `Check in to plant your first flower. ${time}`;
}

/** Streak header on Today: running count plus the last seven days. */
export function StreakCard({ checkinDays, today, remaining }: StreakCardProps) {
  const { count, isTodayDone } = currentStreak(checkinDays, today);
  const week = lastWeek(checkinDays, today);
  const title = count > 0 ? daysInARow(count) : 'Start your streak';
  const sub = subtitle(count, isTodayDone, remaining);

  return (
    <View accessible accessibilityLabel={`${title}. ${sub}`} style={styles.card}>
      <View style={styles.top}>
        <View style={styles.badge}>
          <Flower size={34} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{sub}</Text>
        </View>
      </View>
      <View style={styles.week}>
        {week.map((day) => (
          <View key={day.day} style={styles.day}>
            <View
              style={[
                styles.dot,
                day.isDone ? styles.done : day.isToday ? styles.todayOpen : styles.missed,
              ]}>
              {day.isDone && <Icon name="check" size={20} strokeWidth={3} color={colors.textOnAccent} />}
            </View>
            <Text style={[styles.weekday, day.isToday && styles.weekdayToday]}>{day.weekday}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.softPink,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { ...type.option, fontFamily: type.heading.fontFamily, color: colors.text },
  subtitle: { ...type.label, fontFamily: type.chip.fontFamily, color: colors.heroText },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: spacing.xxs },
  dot: {
    width: DAY_DOT,
    height: DAY_DOT,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { backgroundColor: colors.accent },
  todayOpen: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.accent, backgroundColor: colors.surface },
  missed: { backgroundColor: colors.blush },
  weekday: { ...type.chip, fontSize: 14, color: colors.heroText },
  weekdayToday: { color: colors.text },
});
