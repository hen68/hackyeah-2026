import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

const HERO_HEIGHT = 380;
const HERO_RADIUS = 40;
const HALO_SIZE = 168;
const BADGE_SIZE = 116;
const LOGO_SIZE = 64;

/** Artboard `Main` (1 · Welcome). */
export default function WelcomeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.halo}>
          <View style={styles.badge}>
            <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={1.5} strokeLinecap="round">
              <Circle cx={12} cy={12} r={9} />
              <Path d="M8 12.5c1.2 2 2.6 3 4 3s2.8-1 4-3" />
            </Svg>
          </View>
        </View>
      </View>

      <SafeAreaView edges={['bottom']} style={styles.body}>
        <Text style={styles.brand}>Digna</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Feel understood through menopause
        </Text>
        <Text style={styles.lead}>
          Tell me how you feel each day. Before every visit, your doctor gets a clear report.
        </Text>

        <View style={styles.actions}>
          <PrimaryButton label="Get started" onPress={() => router.push('/register')} />
          <Link href="/sign-in" style={styles.secondary} accessibilityRole="link">
            I already have an account
          </Link>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: {
    height: HERO_HEIGHT,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.heroGradient[0]} 0%, ${colors.heroGradient[1]} 100%)`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: 36, paddingBottom: spacing.xxl, gap: spacing.md },
  brand: { ...type.heading, fontSize: 20, color: colors.accent },
  title: { ...type.title, color: colors.text },
  lead: { ...type.body, fontSize: 20, lineHeight: 29, color: colors.textMuted },
  actions: { marginTop: 'auto', gap: 14 },
  secondary: {
    ...type.option,
    fontSize: 19,
    minHeight: sizes.minTouchTarget + 8,
    color: colors.accent,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 14,
  },
});
