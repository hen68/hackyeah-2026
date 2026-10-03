import { Redirect } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { toCompleteAnswers } from '@/features/onboarding/onboarding-state';
import { inferStage, STAGE_COPY } from '@/features/onboarding/stage';
import { useSaveOnboarding } from '@/features/onboarding/use-save-onboarding';
import { useUpdateProfile } from '@/features/profile/hooks';
import { toUserMessage } from '@/lib/errors';
import { colors, radii, spacing, type } from '@/theme/tokens';

const DISCLAIMER = 'This is not a diagnosis. Only your doctor can confirm it.';
const NOTE_FAILED = "I couldn't read your own words just now. You can tell me again in the chat.";
const NEXT_STEPS = [
  'Each day, answer 3 short questions. It takes one minute.',
  "I spot patterns and tell you what's worth showing your doctor.",
  'Before each visit, you get a report to give your doctor.',
] as const;
const HERO_RADIUS = 36;
const HERO_TOP_PADDING = 48;
const STEP_BADGE_SIZE = 40;

/** Artboard OnbResult. Saves everything on enter; "Start" marks onboarding complete. */
export default function ResultScreen() {
  const { session } = useAuth();
  const { state } = useOnboarding();
  // Only rendered inside the onboarding gate, which requires a session.
  const patientId = session?.user.id ?? '';
  const answers = useMemo(() => toCompleteAnswers(state), [state]);
  const save = useSaveOnboarding(patientId, answers);
  const complete = useUpdateProfile(patientId);

  // Answers live in memory; after an app restart mid-flow, start the questions again.
  if (!answers) return <Redirect href="/age" />;

  const copy = STAGE_COPY[inferStage(answers.ageBand, answers.lastPeriod)];
  const errorMessage = save.error ? toUserMessage(save.error) : complete.error ? toUserMessage(complete.error) : null;

  const handleStart = () => complete.mutate({ onboarding_completed_at: new Date().toISOString() });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top']} style={styles.hero}>
          <Text style={styles.eyebrow}>Based on your answers</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {copy.title}
          </Text>
          <Text style={styles.heroBody}>{copy.body}</Text>
          {copy.note && <Text style={styles.heroBody}>{copy.note}</Text>}
        </SafeAreaView>

        <View style={styles.body}>
          <Text style={styles.muted}>{DISCLAIMER}</Text>
          {save.data?.note === 'failed' && <Text style={styles.muted}>{NOTE_FAILED}</Text>}

          <Text accessibilityRole="header" style={styles.subtitle}>
            What happens next
          </Text>
          <View style={styles.steps}>
            {NEXT_STEPS.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {errorMessage && (
          <Text accessibilityRole="alert" style={styles.error}>
            {errorMessage}
          </Text>
        )}
        {save.isError ? (
          <PrimaryButton label="Try again" onPress={save.retry} />
        ) : (
          <PrimaryButton
            label={
              save.isSuccess ? (complete.isPending ? 'Starting…' : 'Start my first check-in') : 'Saving your answers…'
            }
            disabled={!save.isSuccess || complete.isPending}
            onPress={handleStart}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1 },
  hero: {
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.heroGradient[0]} 0%, ${colors.heroGradient[1]} 100%)`,
    paddingHorizontal: spacing.xl,
    paddingTop: HERO_TOP_PADDING,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  eyebrow: { ...type.option, fontSize: 19, color: colors.heroText },
  title: { ...type.title, color: colors.text },
  heroBody: { ...type.body, fontSize: 19, lineHeight: 27, color: colors.text },
  body: { padding: spacing.xl, gap: 22 },
  muted: { ...type.label, fontFamily: type.body.fontFamily, lineHeight: 25, color: colors.textMuted },
  subtitle: { ...type.heading, fontSize: 22, color: colors.text },
  steps: { gap: 18 },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepBadge: {
    width: STEP_BADGE_SIZE,
    height: STEP_BADGE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.softPinkStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { ...type.option, fontSize: 19, fontFamily: type.heading.fontFamily, color: colors.accent },
  stepText: { ...type.body, flex: 1, fontSize: 20, lineHeight: 28, paddingTop: 6, color: colors.text },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: spacing.sm },
  error: { ...type.body, color: colors.accentPressed, textAlign: 'center' },
});
