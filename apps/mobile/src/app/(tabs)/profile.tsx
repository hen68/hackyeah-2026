import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-provider';
import { WATCH_OPTIONS } from '@/features/onboarding/answers';
import { useToggleWearable, useWearableConnections } from '@/features/profile/hooks';
import { formatExpiry, summarizeProfile } from '@/features/profile/profile-summary';
import { toUserMessage } from '@/lib/errors';
import { createLinkCode } from '@/lib/api/link-codes';
import { colors, radii, spacing, type } from '@/theme/tokens';

const AVATAR_SIZE = 72;
const ROW_HEIGHT = 64;
const SIGN_OUT_TEXT = '#B03A5B';
const COUNTDOWN_TICK_MS = 60_000;

/** Artboard Profile (core items: header, watch, my doctor, sign out). */
export default function ProfileScreen() {
  const { session, profile } = useAuth();
  // Only rendered inside the tabs gate, which requires a session.
  const patientId = session?.user.id ?? '';
  const summary = profile ? summarizeProfile(profile, session?.user.email ?? '') : null;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Profile
        </Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        {summary && (
          <View style={[styles.card, styles.headerCard]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{summary.initial}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.name}>{summary.name}</Text>
              {summary.details !== '' && <Text style={styles.muted}>{summary.details}</Text>}
            </View>
          </View>
        )}

        <WatchSection patientId={patientId} />
        <DoctorSection />
        <SignOutButton />
      </ScrollView>
    </View>
  );
}

function WatchSection({ patientId }: { patientId: string }) {
  const connections = useWearableConnections(patientId);
  const toggle = useToggleWearable(patientId);
  const connected = new Set((connections.data ?? []).map((connection) => connection.provider));
  const error = connections.error ?? toggle.error;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          My watch
        </Text>
        <Text style={styles.muted}>
          {connected.size > 0
            ? 'Connected. Syncing comes soon.'
            : 'Not connected. Tips and patterns are less accurate.'}
        </Text>
      </View>
      {connections.isPending ? (
        <ActivityIndicator accessibilityLabel="Loading your watches" color={colors.accent} />
      ) : (
        WATCH_OPTIONS.map((option) => {
          const isConnected = connected.has(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggle.mutate({ provider: option.value, isConnected })}
              disabled={toggle.isPending}
              accessibilityRole="switch"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: isConnected, disabled: toggle.isPending }}
              style={[styles.watchRow, isConnected ? styles.watchOn : styles.watchOff]}>
              <Text style={styles.rowLabel}>{option.label}</Text>
              <Text style={isConnected ? styles.connected : styles.connect}>
                {isConnected ? 'Connected' : 'Connect'}
              </Text>
            </Pressable>
          );
        })
      )}
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {toUserMessage(error)}
        </Text>
      )}
    </View>
  );
}

function DoctorSection() {
  const linkCode = useMutation({ mutationFn: createLinkCode });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!linkCode.data) return;
    const timer = setInterval(() => setNow(new Date()), COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, [linkCode.data]);

  const expiry = linkCode.data ? formatExpiry(linkCode.data.expires_at, now) : null;
  const hasActiveCode = linkCode.data !== undefined && expiry !== null;

  const handleCreate = () => {
    setNow(new Date());
    linkCode.mutate();
  };

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        My doctor
      </Text>
      <View style={styles.card}>
        {hasActiveCode ? (
          <>
            <Text accessibilityLabel={`Your code is ${linkCode.data.code.split('').join(' ')}`} style={styles.code}>
              {linkCode.data.code}
            </Text>
            <Text style={styles.muted}>{`Share this code with your doctor. ${expiry}`}</Text>
          </>
        ) : (
          <Text style={styles.muted}>Give your doctor a code so they can see your check-ins.</Text>
        )}
        <Pressable
          onPress={handleCreate}
          disabled={linkCode.isPending}
          accessibilityRole="button"
          accessibilityState={{ disabled: linkCode.isPending, busy: linkCode.isPending }}
          style={styles.outlineButton}>
          <Text style={styles.outlineLabel}>
            {linkCode.isPending ? 'Creating…' : hasActiveCode ? 'Get a new code' : 'Get a code for my doctor'}
          </Text>
        </Pressable>
        {linkCode.error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {toUserMessage(linkCode.error)}
          </Text>
        )}
      </View>
    </View>
  );
}

function SignOutButton() {
  const { auth } = useAuth();
  const signOut = useMutation({ mutationFn: () => auth.signOut() });

  const handlePress = () =>
    Alert.alert('Sign out?', 'You can sign in again with your email and password.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut.mutate() },
    ]);

  return (
    <View style={styles.signOutGroup}>
      {signOut.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {toUserMessage(signOut.error)}
        </Text>
      )}
      <Pressable
        onPress={handlePress}
        disabled={signOut.isPending}
        accessibilityRole="button"
        accessibilityState={{ disabled: signOut.isPending }}
        style={styles.outlineButton}>
        <Text style={[styles.outlineLabel, styles.signOutLabel]}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.appBackground },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: { ...type.title, fontSize: 32, lineHeight: 38, color: colors.text },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, gap: spacing.sm },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radii.pill,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.heroGradient[0]} 0%, ${colors.heroGradient[1]} 100%)`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...type.title, fontSize: 30, lineHeight: 36, color: colors.heroText },
  headerText: { flex: 1, gap: spacing.xxs },
  name: { ...type.heading, color: colors.text },
  muted: { ...type.body, color: colors.textMuted },
  section: { gap: spacing.sm },
  sectionHeading: { gap: spacing.xxs },
  sectionTitle: { ...type.heading, color: colors.text },
  watchRow: {
    minHeight: ROW_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.option,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  watchOn: { borderColor: colors.teal, backgroundColor: colors.tealSoft },
  watchOff: { borderColor: colors.border, backgroundColor: colors.surface },
  rowLabel: { ...type.option, fontSize: 20, color: colors.text, flexShrink: 1 },
  connected: { ...type.label, fontFamily: type.heading.fontFamily, color: colors.tealDark },
  connect: { ...type.label, color: colors.accent },
  code: { ...type.title, fontSize: 36, lineHeight: 42, letterSpacing: 4, color: colors.text },
  outlineButton: {
    minHeight: ROW_HEIGHT,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  outlineLabel: { ...type.option, fontSize: 20, color: colors.text },
  signOutGroup: { gap: spacing.sm },
  signOutLabel: { color: SIGN_OUT_TEXT },
  error: { ...type.body, fontSize: 17, color: colors.accentPressed },
});
