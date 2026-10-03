import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { WATCH_OPTIONS } from '@/features/onboarding/answers';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { OnboardingScreen, onboardingStyles } from '@/features/onboarding/onboarding-screen';
import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

const BADGE_SIZE = 76;
const BADGE_ICON_SIZE = 40;
const FEATURE_ICON_BOX = 44;
const PROVIDER_ROW_HEIGHT = 64;

const FEATURES: readonly { icon: IconName; title: string; body: string }[] = [
  { icon: 'thermometer', title: 'Body temperature', body: 'Spots night sweats while you sleep' },
  { icon: 'heart', title: 'Heart rate', body: 'Shows if your heart races during hot flushes' },
  { icon: 'moon', title: 'Sleep', body: 'Measures how well you really sleep' },
];

/** Artboard OnbWatch (step 5). Records the choice only; syncing comes in Step 11. */
export default function WatchScreen() {
  const { state, dispatch } = useOnboarding();
  const goToResult = () => router.push('/result');

  const handleSkip = () => {
    if (state.watch) dispatch({ type: 'toggleWatch', provider: state.watch });
    goToResult();
  };

  return (
    <OnboardingScreen
      step={5}
      trailing={
        <Pressable onPress={handleSkip} accessibilityRole="button" accessibilityLabel="Skip" style={styles.skip}>
          <Text style={styles.link}>Skip</Text>
        </Pressable>
      }
>
      <View style={styles.titleRow}>
        <View style={styles.badge}>
          <Icon name="watch" size={BADGE_ICON_SIZE} strokeWidth={1.6} />
        </View>
        <Text accessibilityRole="header" style={[onboardingStyles.title, styles.title]}>
          Connect your watch
        </Text>
      </View>

      <Text style={onboardingStyles.lead}>Your watch notices things you might miss, even while you sleep.</Text>

      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icon name={feature.icon} size={22} color={colors.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureBody}>{feature.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.callout}>
        <Text style={styles.calloutStrong}>The more I know, the better I can help.</Text> Your tips and your doctor’s
        report get more accurate.
      </Text>

      <View style={styles.providers}>
        {WATCH_OPTIONS.map((option) => {
          const isConnected = state.watch === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => dispatch({ type: 'toggleWatch', provider: option.value })}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isConnected }}
              accessibilityHint={isConnected ? 'Disconnects this app' : 'Connects this app'}
              style={[styles.provider, isConnected ? styles.providerOn : styles.providerOff]}>
              <Text style={styles.providerLabel}>{option.label}</Text>
              <Text style={isConnected ? styles.connected : styles.connect}>
                {isConnected ? 'Connected' : 'Connect'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.footnote}>You decide what to share. You can disconnect at any time.</Text>

      {state.watch && <PrimaryButton label="Continue" onPress={goToResult} />}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  skip: { minHeight: sizes.minTouchTarget + 4, justifyContent: 'center', paddingHorizontal: spacing.xxs },
  link: { ...type.option, fontSize: 19, color: colors.accent },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radii.pill,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.heroGradient[0]} 0%, ${colors.heroGradient[1]} 100%)`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 30, lineHeight: 35 },
  features: { gap: spacing.md },
  feature: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  featureIcon: {
    width: FEATURE_ICON_BOX,
    height: FEATURE_ICON_BOX,
    borderRadius: radii.pill,
    backgroundColor: colors.softPinkStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { ...type.option, fontSize: 20, color: colors.text },
  featureBody: { ...type.body, color: colors.textMuted },
  callout: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.option,
    paddingVertical: spacing.md,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  calloutStrong: { fontFamily: type.heading.fontFamily, color: colors.lavender },
  providers: { gap: 10 },
  provider: {
    minHeight: PROVIDER_ROW_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderRadius: radii.option,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  providerOn: { borderColor: colors.teal, backgroundColor: colors.tealSoft },
  providerOff: { borderColor: colors.border, backgroundColor: colors.surface },
  providerLabel: { ...type.option, fontSize: 20, color: colors.text, flexShrink: 1 },
  connected: { ...type.label, fontFamily: type.heading.fontFamily, color: colors.tealDark },
  connect: { ...type.label, color: colors.accent },
  footnote: { ...type.label, fontFamily: type.body.fontFamily, color: colors.textMuted },
});
