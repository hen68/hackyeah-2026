import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { chipDotColor, chipText, type ChatItem } from '@/features/chat/thread';
import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

const BUBBLE_RADIUS = 22;
const BUBBLE_TAIL = 6;
const BUBBLE_MAX_WIDTH = '86%';
const DOT_SIZE = 12;
const SPOKEN_ICON = 14;
const SPOKEN_TEXT = '#FFE3EA';
const SENDING_OPACITY = 0.7;
const ADDED_TITLE = 'I’ve added this to today:';

type ChatBubbleProps = {
  item: ChatItem;
  labelFor: (code: string) => string;
  onRetry: (item: ChatItem) => void;
  /** Opens the day the observations were logged on. */
  onChangeDay: (date: string) => void;
};

/** Artboard Chat bubbles: patient on the right, Digna on the left with "added to today" chips. */
export function ChatBubble({ item, labelFor, onRetry, onChangeDay }: ChatBubbleProps) {
  if (item.role === 'user') {
    return (
      <View style={styles.userColumn}>
        <View style={[styles.bubble, styles.user, item.status === 'sending' && styles.sending]}>
          {item.inputMode === 'voice' && (
            <View style={styles.spoken}>
              <Icon name="mic" size={SPOKEN_ICON} color={SPOKEN_TEXT} />
              <Text style={styles.spokenText}>Spoken</Text>
            </View>
          )}
          <Text style={[styles.text, styles.userText]}>{item.content}</Text>
        </View>
        {item.status === 'failed' && (
          <View style={styles.failed}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {item.error}
            </Text>
            <Pressable
              onPress={() => onRetry(item)}
              accessibilityRole="button"
              accessibilityLabel="Try sending again"
              style={styles.pillButton}>
              <Text style={styles.pillLabel}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const firstDay = item.observations[0]?.observedOn;
  return (
    <View style={[styles.bubble, styles.assistant]}>
      <Text style={styles.text}>{item.content}</Text>
      {firstDay && (
        <View style={styles.added}>
          <Text style={styles.text}>{ADDED_TITLE}</Text>
          {item.observations.map((observation) => (
            <View key={observation.key} style={styles.chip}>
              <View style={[styles.dot, { backgroundColor: chipDotColor(observation.severity) }]} />
              <Text style={styles.chipText}>{chipText(observation, labelFor)}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => onChangeDay(firstDay)}
            accessibilityRole="link"
            accessibilityLabel="Change this"
            accessibilityHint="Opens the day these were added to"
            style={styles.pillButton}>
            <Text style={styles.pillLabel}>Change this</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function TypingBubble() {
  return (
    <View
      accessible
      accessibilityLabel="Digna is typing"
      accessibilityLiveRegion="polite"
      style={[styles.bubble, styles.assistant]}>
      <Text style={[styles.text, styles.muted]}>Digna is typing…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: BUBBLE_MAX_WIDTH,
    borderRadius: BUBBLE_RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: spacing.xs,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderBottomRightRadius: BUBBLE_TAIL,
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: BUBBLE_TAIL,
  },
  sending: { opacity: SENDING_OPACITY },
  userColumn: { alignItems: 'flex-end', gap: spacing.xs },
  text: { ...type.body, color: colors.text },
  userText: { color: colors.textOnAccent },
  muted: { color: colors.textMuted },
  spoken: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  spokenText: { ...type.chip, color: SPOKEN_TEXT },
  added: { gap: spacing.xs, marginTop: spacing.xxs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.softPink,
    borderRadius: radii.optionSmall,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
  chipText: { ...type.label, color: colors.text, flexShrink: 1 },
  failed: { alignItems: 'flex-end', gap: spacing.xs, maxWidth: BUBBLE_MAX_WIDTH },
  errorText: { ...type.label, color: colors.accentPressed, textAlign: 'right' },
  pillButton: {
    alignSelf: 'flex-start',
    minHeight: sizes.minTouchTarget,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  pillLabel: { ...type.label, color: colors.text },
});
