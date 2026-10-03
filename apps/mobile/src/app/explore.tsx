import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { colors, type } from '@/theme/tokens';

/** Template tab kept only until Step 5b replaces the tab layout. */
export default function ExploreScreen() {
  return (
    <Screen background="app">
      <Text style={styles.text}>Coming soon</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { ...type.heading, color: colors.text },
});
