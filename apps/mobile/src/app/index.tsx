import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { OptionButton } from '@/components/ui/option-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SeverityPicker } from '@/components/ui/severity-picker';
import { StepProgress } from '@/components/ui/step-progress';
import { colors, spacing, type, type Severity } from '@/theme/tokens';

const AGE_OPTIONS = ['40 to 44', '45 to 49', '50 to 54'];

/** Temporary UI-kit preview; Step 5b replaces this route with the real Home. */
export default function HomeScreen() {
  const [age, setAge] = useState<string | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);

  return (
    <Screen background="app">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Digna UI kit</Text>
        <StepProgress step={1} />
        {AGE_OPTIONS.map((label) => (
          <OptionButton key={label} label={label} isSelected={age === label} onPress={() => setAge(label)} />
        ))}
        <PrimaryButton
          label={age ? 'Continue' : 'Choose an answer'}
          disabled={age === null}
          onPress={() => setAge(null)}
        />
        <Card>
          <Text style={styles.question}>How bad were your hot flushes today?</Text>
          <SeverityPicker value={severity} onChange={setSeverity} accessibilityLabel="Hot flushes" />
        </Card>
        <Chip label="Dizziness" onPress={() => setSeverity(null)} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingVertical: spacing.xl },
  title: { ...type.title, color: colors.text },
  question: { ...type.question, color: colors.text },
});
