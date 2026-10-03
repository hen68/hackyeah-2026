import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';

// Rejects only if the splash is already hidden (e.g. after fast refresh); safe to ignore.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function TabLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const isReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontError) {
      // Text falls back to the system font; the app stays usable.
      console.warn('Failed to load Inter', fontError);
    }
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontError]);

  if (!isReady) {
    return null;
  }

  return (
    // Light only until dark tokens exist (app.json userInterfaceStyle: light).
    <ThemeProvider value={DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
