import { Link, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { toUserMessage } from '@/lib/errors';
import { colors, radii, sizes, spacing, type } from '@/theme/tokens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Matches `minimum_password_length` in supabase/config.toml and the hosted project. */
export const MIN_PASSWORD_LENGTH = 8;

export type AuthFormMode = 'register' | 'signIn';

const COPY: Record<
  AuthFormMode,
  {
    title: string;
    lead: string;
    submit: string;
    busy: string;
    switchLabel: string;
    switchHref: Href;
  }
> = {
  register: {
    title: 'Create your account',
    lead: `Use your email and a password with at least ${MIN_PASSWORD_LENGTH} characters.`,
    submit: 'Create account',
    busy: 'Creating…',
    switchLabel: 'I already have an account',
    switchHref: '/sign-in',
  },
  signIn: {
    title: 'Welcome back',
    lead: 'Sign in with your email and password.',
    submit: 'Sign in',
    busy: 'Signing in…',
    switchLabel: 'Create an account',
    switchHref: '/register',
  },
};

type AuthFormProps = {
  mode: AuthFormMode;
  /** Resolves with a notice to show (e.g. "check your email"), or nothing when the session takes over. */
  onSubmit: (email: string, password: string) => Promise<string | void>;
};

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const copy = COPY[mode];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // State updates land a render late; the ref blocks a second tap in the same frame.
  const isInFlight = useRef(false);
  const passwordRef = useRef<TextInput>(null);

  const minPassword = mode === 'register' ? MIN_PASSWORD_LENGTH : 1;
  const isValid = EMAIL_PATTERN.test(email.trim()) && password.length >= minPassword;

  // Success usually needs no navigation: the new session flips the root gate.
  const handleSubmit = async () => {
    if (isInFlight.current) return;
    isInFlight.current = true;
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await onSubmit(email, password);
      if (result) setNotice(result);
    } catch (cause: unknown) {
      setError(toUserMessage(cause));
    } finally {
      isInFlight.current = false;
      setIsBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <BackButton />

          <Text accessibilityRole="header" style={styles.title}>
            {copy.title}
          </Text>
          <Text style={styles.lead}>{copy.lead}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType={mode === 'register' ? 'username' : 'emailAddress'}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              autoCorrect={false}
              secureTextEntry
              textContentType={mode === 'register' ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={isValid && !isBusy ? handleSubmit : undefined}
              style={styles.input}
            />
          </View>

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {notice && (
            <Text accessibilityRole="alert" style={styles.notice}>
              {notice}
            </Text>
          )}

          <View style={styles.actions}>
            <PrimaryButton
              label={isBusy ? copy.busy : copy.submit}
              disabled={isBusy || !isValid}
              onPress={handleSubmit}
            />
            <Link href={copy.switchHref} replace accessibilityRole="link" style={styles.switch}>
              {copy.switchLabel}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
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
  notice: { ...type.body, color: colors.tealDark },
  actions: { marginTop: 'auto', gap: spacing.xs },
  switch: {
    ...type.option,
    fontSize: 19,
    minHeight: sizes.minTouchTarget + 8,
    color: colors.accent,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 14,
  },
});
