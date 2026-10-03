import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/ui/tab-bar';

// JS tabs with a custom bar: the native tab bar can't match the artboard's large icons and labels.
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }} backBehavior="history">
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="day/[date]" options={{ href: null }} />
    </Tabs>
  );
}
