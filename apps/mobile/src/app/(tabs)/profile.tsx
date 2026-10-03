import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useAuth } from '@/features/auth/auth-provider';
import { toUserMessage } from '@/lib/errors';
import { colors, type } from '@/theme/tokens';

/** Placeholder until Step 9b; sign out is here so the auth flow can be exercised. */
export default function ProfileScreen() {
  const { auth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      setError(null);
      await auth.signOut();
    } catch (cause: unknown) {
      setError(toUserMessage(cause));
    }
  };

  return (
    <PlaceholderScreen title="Profile">
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <PrimaryButton label="Sign out" onPress={handleSignOut} />
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  error: { ...type.body, color: colors.accentPressed },
});
