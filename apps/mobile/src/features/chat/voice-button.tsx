import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import type { VoiceStatus } from '@/features/chat/voice-transcript';
import { colors } from '@/theme/tokens';

const MIC_SIZE = 64;
const MIC_ICON = 30;
const RINGS = [0, 1, 2] as const;
const RING_STEP = 0.12;
const RING_OPACITY = 0.32;
const RING_MIN_SPREAD = 0.3;
const BREATH_DEPTH = 0.35;
const BREATH_MS = 1400;
const FADE_MS = 220;
const STATIC_RING_SCALE = 1.25;

type VoiceButtonProps = {
  status: VoiceStatus;
  level: SharedValue<number>;
  /** Current status text, also used as the button’s accessible name. */
  label: string;
  onPress: () => void;
};

type RingProps = {
  index: number;
  level: SharedValue<number>;
  breath: SharedValue<number>;
  presence: SharedValue<number>;
};

/** One concentric ring; outer rings spread further and fade more. */
function Ring({ index, level, breath, presence }: RingProps) {
  const style = useAnimatedStyle(() => {
    const loudness = level.get();
    // Breathing carries the rings while she is quiet and gives way as her voice gets louder.
    const drive = Math.max(loudness, breath.get() * BREATH_DEPTH * (1 - loudness));
    const spread = RING_MIN_SPREAD + (1 - RING_MIN_SPREAD) * drive;
    return {
      opacity: presence.get() * (RING_OPACITY / (index + 1)),
      transform: [{ scale: 1 + (index + 1) * RING_STEP * spread }],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

/** The big mic. While listening, rings pulse with her voice (a still ring when Reduce Motion is on). */
export function VoiceButton({ status, level, label, onPress }: VoiceButtonProps) {
  const isReducedMotion = useReducedMotion();
  const isListening = status === 'listening';
  const isBusy = status === 'requesting' || status === 'stopping';
  const breath = useSharedValue(0);
  const presence = useSharedValue(0);

  useEffect(() => {
    if (isListening && !isReducedMotion) {
      presence.set(withTiming(1, { duration: FADE_MS }));
      breath.set(withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
      return;
    }
    cancelAnimation(breath);
    breath.set(0);
    presence.set(withTiming(0, { duration: FADE_MS }));
  }, [isListening, isReducedMotion, breath, presence]);

  return (
    <View style={styles.wrap}>
      {isReducedMotion
        ? isListening && <View pointerEvents="none" style={[styles.ring, styles.staticRing]} />
        : RINGS.map((index) => <Ring key={index} index={index} level={level} breath={breath} presence={presence} />)}
      <Pressable
        onPress={onPress}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Your words appear in the message box so you can check them before sending"
        accessibilityState={{ busy: isBusy, disabled: isBusy, selected: isListening }}
        style={({ pressed }) => [styles.mic, (pressed || isListening) && styles.micActive]}>
        <Icon name="mic" size={MIC_ICON} color={colors.textOnAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: MIC_SIZE, height: MIC_SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: colors.accent,
  },
  staticRing: { opacity: RING_OPACITY, transform: [{ scale: STATIC_RING_SCALE }] },
  mic: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: { backgroundColor: colors.accentPressed },
});
