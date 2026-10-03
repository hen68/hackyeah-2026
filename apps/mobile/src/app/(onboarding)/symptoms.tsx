import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { OptionButton } from '@/components/ui/option-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SYMPTOM_OPTIONS } from '@/features/onboarding/answers';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { OnboardingScreen, onboardingStyles } from '@/features/onboarding/onboarding-screen';
import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

/** Generous, but bounded: the text goes to the chat function. */
const MAX_FREE_TEXT_LENGTH = 1000;
const FREE_TEXT_LINES = 4;

type InputMode = 'speak' | 'write';

/** Artboard OnbSymptoms (step 4). "Speak" falls back to typing until voice lands (Step 11). */
export default function SymptomsScreen() {
  const { state, dispatch } = useOnboarding();
  const [mode, setMode] = useState<InputMode | null>(state.freeText ? 'write' : null);

  const canContinue = state.symptoms.length > 0 || state.freeText.trim().length > 0;

  const handleRemoveText = () => {
    dispatch({ type: 'setFreeText', value: '' });
    setMode(null);
  };

  return (
    <OnboardingScreen
      step={4}
      footer={
        <PrimaryButton
          label={canContinue ? 'Continue' : 'Choose or tell me something'}
          disabled={!canContinue}
          onPress={() => router.push('/watch')}
        />
      }>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={onboardingStyles.title}>
          What’s bothering you?
        </Text>
        <Text style={onboardingStyles.lead}>Tap everything that applies.</Text>
      </View>

      <View style={styles.grid}>
        {SYMPTOM_OPTIONS.map((option) => (
          <View key={option.value} style={styles.cell}>
            <OptionButton
              label={option.label}
              isSelected={state.symptoms.includes(option.value)}
              onPress={() => dispatch({ type: 'toggleSymptom', code: option.value })}
            />
          </View>
        ))}
      </View>

      <View style={styles.ownWords}>
        <Text style={styles.ownWordsTitle}>Or tell me in your own words</Text>
        {mode === null ? (
          <View style={styles.modes}>
            <ModeButton label="Speak" icon="mic" onPress={() => setMode('speak')} />
            <ModeButton label="Write" icon="pencil" onPress={() => setMode('write')} />
          </View>
        ) : (
          <View style={styles.field}>
            {mode === 'speak' && <Text style={styles.note}>Voice is coming soon. For now, please type.</Text>}
            <Text style={styles.label}>How have you been feeling?</Text>
            <TextInput
              value={state.freeText}
              onChangeText={(value) => dispatch({ type: 'setFreeText', value })}
              accessibilityLabel="How have you been feeling?"
              multiline
              numberOfLines={FREE_TEXT_LINES}
              maxLength={MAX_FREE_TEXT_LENGTH}
              autoFocus
              textAlignVertical="top"
              style={styles.textarea}
            />
            <Pressable
              onPress={handleRemoveText}
              accessibilityRole="button"
              accessibilityLabel="Remove what I wrote"
              style={styles.remove}>
              <Text style={styles.removeLabel}>Remove</Text>
            </Pressable>
          </View>
        )}
      </View>
    </OnboardingScreen>
  );
}

function ModeButton({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.mode, pressed && styles.modePressed]}>
      <Icon name={icon} color={colors.accent} />
      <Text style={styles.modeLabel}>{label}</Text>
    </Pressable>
  );
}

const TEXTAREA_MIN_HEIGHT = 132;

const styles = StyleSheet.create({
  heading: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { flexBasis: '46%', flexGrow: 1 },
  ownWords: { gap: 14 },
  ownWordsTitle: { ...type.option, fontSize: 20, color: colors.text },
  modes: { flexDirection: 'row', gap: spacing.sm },
  mode: {
    flex: 1,
    minHeight: sizes.primaryButtonHeight,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modePressed: { backgroundColor: colors.softPink },
  modeLabel: { ...type.option, fontSize: 20, color: colors.accent },
  field: { gap: spacing.xs },
  note: { ...type.body, color: colors.textMuted },
  label: { ...type.body, color: colors.textMuted },
  textarea: {
    ...type.body,
    fontSize: 20,
    lineHeight: 29,
    minHeight: TEXTAREA_MIN_HEIGHT,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.option,
    color: colors.text,
  },
  remove: { alignSelf: 'flex-start', minHeight: sizes.minTouchTarget, justifyContent: 'center' },
  removeLabel: { ...type.body, color: colors.textMuted, textDecorationLine: 'underline' },
});
