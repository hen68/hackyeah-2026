import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { resolveEntryRoute } from '@/features/auth/resolve-entry-route';
import { toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, sizes, spacing, type } from '@/theme/tokens';

// Rejects only if the splash is already hidden (e.g. after fast refresh); safe to ignore.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      // Text falls back to the system font; the app stays usable.
      console.warn('Failed to load Inter', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // Light only until dark tokens exist (app.json userInterfaceStyle: light).
    <ThemeProvider value={DefaultTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, profile, profileError, retryProfile, auth } = useAuth();
  const route = resolveEntryRoute(session, profile);
  const isBlockedByError = route === 'error' || (route === 'loading' && profileError !== null);

  // Escape hatch when the profile can never load (e.g. deleted user with a cached session).
  const handleSignOut = () => {
    auth.signOut().catch(() => supabase.auth.signOut({ scope: 'local' }));
  };

  useEffect(() => {
    if (route !== 'loading' || isBlockedByError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [route, isBlockedByError]);

  if (isBlockedByError) {
    return (
      <Screen style={styles.error}>
        <Text accessibilityRole="alert" style={styles.errorText}>
          {toUserMessage(profileError)}
        </Text>
        <PrimaryButton label="Try again" onPress={retryProfile} />
        <Pressable onPress={handleSignOut} accessibilityRole="button" style={styles.signOut}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </Screen>
    );
  }

  if (route === 'loading') {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={route === 'tabs'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="day/[date]" />
      </Stack.Protected>
      <Stack.Protected guard={route === 'onboarding'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={route === 'auth'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  error: { justifyContent: 'center', gap: spacing.xl },
  errorText: { ...type.body, color: colors.text, textAlign: 'center' },
  signOut: { minHeight: sizes.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  signOutLabel: { ...type.option, fontSize: 19, color: colors.accent },
});
