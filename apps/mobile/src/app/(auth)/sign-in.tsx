import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/features/auth/auth-provider';
import { toUserMessage } from '@/lib/errors';
import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_CODE_LENGTH = 6;
const BACK_BUTTON_SIZE = 48;

type Stage = 'email' | 'code';

/** Returning users: email → one-time code. Never creates an account. */
export default function SignInScreen() {
  const { auth } = useAuth();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailValid = EMAIL_PATTERN.test(email.trim());
  const isCodeValid = code.trim().length >= MIN_CODE_LENGTH;

  const run = async (action: () => Promise<void>, onSuccess?: () => void) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      onSuccess?.();
    } catch (cause: unknown) {
      setError(toUserMessage(cause));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendCode = () => run(() => auth.requestSignInCode(email), () => setStage('code'));
  // Success needs no navigation: the new session flips the root gate.
  const handleVerify = () => run(() => auth.verifySignInCode(email, code));

  const handleBack = () => {
    if (stage === 'code') {
      setStage('email');
      setCode('');
      setError(null);
      return;
    }
    router.back();
  };

  const isEmailStage = stage === 'email';

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>

        <Text accessibilityRole="header" style={styles.title}>
          {isEmailStage ? 'Welcome back' : 'Check your email'}
        </Text>
        <Text style={styles.lead}>
          {isEmailStage
            ? "Enter the email you saved your account with. We'll send you a code."
            : `We sent a code to ${email.trim()}. Enter it below.`}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>{isEmailStage ? 'Email' : 'Code'}</Text>
          {isEmailStage ? (
            <TextInput
              key="email"
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={isEmailValid ? handleSendCode : undefined}
              style={styles.input}
            />
          ) : (
            <TextInput
              key="code"
              value={code}
              onChangeText={setCode}
              accessibilityLabel="Code"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoFocus
              style={styles.input}
            />
          )}
        </View>

        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}

        <View style={styles.actions}>
          {isEmailStage ? (
            <PrimaryButton
              label={isBusy ? 'Sending…' : isEmailValid ? 'Send me a code' : 'Enter your email'}
              disabled={isBusy || !isEmailValid}
              onPress={handleSendCode}
            />
          ) : (
            <PrimaryButton
              label={isBusy ? 'Checking…' : isCodeValid ? 'Sign in' : 'Enter the code'}
              disabled={isBusy || !isCodeValid}
              onPress={handleVerify}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  back: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.appBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.title, color: colors.text },
  lead: { ...type.body, color: colors.textMuted },
  field: { gap: spacing.xs },
  label: { ...type.label, color: colors.textMuted },
  input: {
    ...type.option,
    minHeight: sizes.optionHeight,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.optionSmall,
    color: colors.text,
  },
  error: { ...type.body, color: colors.accentPressed },
  actions: { marginTop: 'auto' },
});
