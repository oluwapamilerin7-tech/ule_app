/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Ulé design tokens, taken from the "Ulé — MVP Mobile" design file.
 * The app is light-only, so these are plain values rather than per-scheme pairs.
 */
export const Palette = {
  ink: '#2F2F2F',
  inkRaised: '#444444',
  slate: '#677782',
  slateDeep: '#3F4A52',
  slateTint: '#E6E9EB',
  grey: '#AEB4B7',
  line: '#DDDFDD',
  divider: '#EEEFEE',
  surface: '#FFFFFF',
  background: '#FBFBFB',
  muted: '#F1F2F1',
  track: '#EDEEED',
  mist: '#EEF0F1',
  coral: '#F69175',
  coralTint: '#FDE9E3',
  coralLine: '#F8C8B9',
  coralDivider: '#FBEDE8',
  danger: '#C0502F',
  dangerDeep: '#A8432A',
  white: '#FFFFFF',
  scrim: 'rgba(47,47,47,0.5)',
} as const;

/** Font family names registered in the root layout via `useFonts`. */
export const FontFamily = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
} as const;

/** Space reserved at the bottom of tab screens for the floating pill nav. */
export const TabBarSpace = 112;
