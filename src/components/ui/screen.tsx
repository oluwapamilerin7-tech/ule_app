import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, TabBarSpace } from '@/constants/theme';

import { IconButton } from './button';
import { KeyboardFocusProvider, useKeyboardSpace } from './keyboard';
import { Text } from './text';

type ScreenProps = {
  children: ReactNode;
  /** Leaves room for the floating pill nav. */
  tabBar?: boolean;
  gap?: number;
  /** Rendered above the scroll area, edge to edge (e.g. the offline banner). */
  banner?: ReactNode;
  /** Absolutely positioned extras such as the floating add button. */
  overlay?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Standard page: safe-area top, scrolling content with the design's 20px gutters. */
export function Screen({ children, tabBar, gap = 16, banner, overlay, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { areaRef, scrollRef, space: keyboardSpace, onFocus: onInputFocus, onScroll } = useKeyboardSpace();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {banner}
      <View ref={areaRef} style={[styles.flex, { paddingBottom: keyboardSpace }]}>
        <KeyboardFocusProvider value={onInputFocus}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { gap, paddingBottom: (tabBar ? TabBarSpace : 28) + insets.bottom },
            contentStyle,
          ]}>
          {children}
        </ScrollView>
        </KeyboardFocusProvider>
      </View>
      {overlay}
    </View>
  );
}

/** Pushes the next content to the bottom of a `Screen` (for bottom-pinned CTAs). */
export function Spacer() {
  return <View style={styles.flex} />;
}

type BackButtonProps = {
  /** Where to go when there is no screen to go back to (e.g. opened from a link). */
  fallback: Href;
};

export function BackButton({ fallback }: BackButtonProps) {
  return (
    <IconButton
      icon="chevron-left"
      label="Back"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
    />
  );
}

type PageTitleProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  size?: number;
};

/** Large Bricolage heading with an optional small line above or below it. */
export function PageTitle({ title, eyebrow, subtitle, size = 28 }: PageTitleProps) {
  return (
    <View style={styles.title}>
      {eyebrow ? (
        <Text weight="medium" size={13} muted>
          {eyebrow}
        </Text>
      ) : null}
      <Text accessibilityRole="header" display size={size} style={styles.titleText}>
        {title}
      </Text>
      {subtitle ? (
        <Text size={15} muted style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    gap: 4,
  },
  titleText: {
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    lineHeight: 22,
  },
});
