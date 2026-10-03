import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <PlaceholderScreen title={date ?? 'Day'} />;
}
