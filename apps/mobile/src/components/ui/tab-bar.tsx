import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { colors, fonts, spacing } from '@/theme/tokens';

type TabItem = { name: string; label: string; icon: IconName };

const TABS: readonly TabItem[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'profile', label: 'Profile', icon: 'profile' },
];

/** Hidden routes that belong to a visible tab (the day detail is part of Calendar). */
const PARENT_TAB: Record<string, string> = { 'day/[date]': 'calendar' };

const ICON_SIZE = 28;
const TAB_MIN_HEIGHT = 56;
const MIN_BOTTOM_PADDING = 8;
/** The home indicator sits low in the inset, so labels can use part of it. */
const BOTTOM_INSET_TRIM = 18;
/** Labels are already 16px; cap Dynamic Type so they don't clip the bar. */
const LABEL_MAX_SCALE = 1.3;

/** Bottom nav from the artboards: white bar, 28px icons, 16px labels, accent when active. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const focusedName = state.routes[state.index]?.name ?? 'index';
  const activeTab = PARENT_TAB[focusedName] ?? focusedName;

  const handlePress = (tab: TabItem) => {
    const route = state.routes.find((item) => item.name === tab.name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (focusedName !== tab.name && !event.defaultPrevented) {
      navigation.navigate(tab.name);
    }
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom - BOTTOM_INSET_TRIM, MIN_BOTTOM_PADDING) }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        const color = isActive ? colors.accent : colors.textMuted;
        return (
          <Pressable
            key={tab.name}
            onPress={() => handlePress(tab)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            style={styles.tab}>
            <Icon name={tab.icon} size={ICON_SIZE} color={color} />
            <Text
              maxFontSizeMultiplier={LABEL_MAX_SCALE}
              style={[styles.label, { color, fontFamily: isActive ? fonts.bold : fonts.semibold }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  tab: { flex: 1, minHeight: TAB_MIN_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: spacing.xxs },
  label: { fontSize: 16, lineHeight: 20 },
});
