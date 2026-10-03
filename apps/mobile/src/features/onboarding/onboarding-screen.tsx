import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { OptionButton } from '@/components/ui/option-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { StepProgress } from '@/components/ui/step-progress';
import { colors, spacing, type } from '@/theme/tokens';

const FIRST_STEP = 1;
const SECTION_GAP = 28;

type OnboardingScreenProps = {
  /** 1-based step; step 1 has no back button (the account already exists). */
  step: number;
  trailing?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

/** Frame for onboarding steps 1–5: progress header, scrolling body, pinned footer. */
export function OnboardingScreen({ step, trailing, footer, children }: OnboardingScreenProps) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <StepProgress step={step} leading={step > FIRST_STEP ? <BackButton /> : null} trailing={trailing} />
        {children}
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </Screen>
  );
}

type Option<T extends string> = { readonly value: T; readonly label: string };

type ChoiceQuestionProps<T extends string> = {
  step: number;
  title: string;
  hint: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  onContinue: () => void;
};

/** OnbAge / OnbPeriod / OnbHRT: one answer, then Continue. */
export function ChoiceQuestion<T extends string>({
  step,
  title,
  hint,
  options,
  value,
  onChange,
  onContinue,
}: ChoiceQuestionProps<T>) {
  const hasAnswer = value !== null;
  return (
    <OnboardingScreen
      step={step}
      footer={
        <PrimaryButton label={hasAnswer ? 'Continue' : 'Choose an answer'} disabled={!hasAnswer} onPress={onContinue} />
      }>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <View accessibilityLabel={title} style={styles.options}>
        {options.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            isSelected={option.value === value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </OnboardingScreen>
  );
}

export const onboardingStyles = StyleSheet.create({
  title: { ...type.title, color: colors.text },
  lead: { ...type.body, fontSize: 20, lineHeight: 28, color: colors.textMuted },
});

const styles = StyleSheet.create({
  body: { gap: SECTION_GAP, paddingTop: spacing.md, paddingBottom: spacing.xl },
  footer: { paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  title: onboardingStyles.title,
  options: { gap: spacing.sm },
  hint: { ...type.body, color: colors.textMuted },
});
