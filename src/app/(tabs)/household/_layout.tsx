import { Stack } from 'expo-router';

import { Palette } from '@/constants/theme';

/** Household keeps the pill nav visible while drilling into Settings and People. */
export default function HouseholdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Palette.background } }} />
  );
}
