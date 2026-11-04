import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Palette } from '@/constants/theme';
import { HouseholdProvider } from '@/state/household';

SplashScreen.preventAutoHideAsync();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Palette.ink,
    background: Palette.background,
    card: Palette.background,
    text: Palette.ink,
    border: Palette.line,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <HouseholdProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={({ route }) =>
            // Everything in (sheets) draws its own backdrop, so present it transparently.
            route.name.startsWith('(sheets)')
              ? {
                  headerShown: false,
                  presentation: 'transparentModal',
                  animation: 'fade',
                  contentStyle: { backgroundColor: 'transparent' },
                }
              : {
                  headerShown: false,
                  contentStyle: { backgroundColor: Palette.background },
                }
          }>
          <Stack.Screen name="new-task" options={{ presentation: 'modal' }} />
          <Stack.Screen name="new-event" options={{ presentation: 'modal' }} />
        </Stack>
      </HouseholdProvider>
    </ThemeProvider>
  );
}
