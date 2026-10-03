import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { colors, radii } from '@/theme/tokens';

const SIZE = 48;
const ICON_SIZE = 22;
const ICON_STROKE = 2.2;

type BackButtonProps = {
  /** Defaults to `router.back()`. */
  onPress?: () => void;
};

/** Round grey back button from the onboarding and form artboards. */
export function BackButton({ onPress = () => router.back() }: BackButtonProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Back" style={styles.button}>
      <Icon name="back" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.appBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
