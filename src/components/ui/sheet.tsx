import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';

import { IconButton } from './button';
import { Icon, type IconName } from './icon';
import { KeyboardFocusProvider, useKeyboardSpace } from './keyboard';
import { Text } from './text';

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

function Scrim({ onPress }: { onPress: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, styles.scrim]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
    </Animated.View>
  );
}

type SheetProps = {
  children: ReactNode;
  onClose?: () => void;
  /** Fills most of the screen, like the task detail sheet. */
  tall?: boolean;
  centered?: boolean;
};

/** Bottom sheet over a dimmed backdrop. Rendered by routes presented as transparent modals. */
export function Sheet({ children, onClose = close, tall, centered }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { areaRef, scrollRef, space: keyboardSpace, onFocus: onInputFocus, onScroll } = useKeyboardSpace();
  return (
    <View style={styles.root}>
      <Scrim onPress={onClose} />
      {/* Padding by the keyboard's height lifts the sheet above it. */}
      <View ref={areaRef} style={[styles.sheetArea, styles.passThrough, { paddingBottom: keyboardSpace }]}>
        <Animated.View
          accessibilityViewIsModal
          entering={SlideInDown.duration(340).easing(EASE_OUT)}
          style={[styles.sheet, tall && { flex: 1, marginTop: insets.top + 56 }]}>
          <View style={styles.handle} />
          <KeyboardFocusProvider value={onInputFocus}>
          <ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: 28 + insets.bottom },
              tall && styles.grow,
              centered && styles.centered,
            ]}>
            {children}
          </ScrollView>
          </KeyboardFocusProvider>
        </Animated.View>
      </View>
    </View>
  );
}

/** Title + round close button at the top of a sheet. */
export function SheetHeader({ title, onClose = close }: { title: string; onClose?: () => void }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" display size={22} style={styles.headerTitle}>
        {title}
      </Text>
      <IconButton icon="close" label="Close" variant="soft" onPress={onClose} />
    </View>
  );
}

type SheetToolbarProps = {
  title: string;
  onDone: () => void;
  doneLabel?: string;
  onCancel?: () => void;
};

/** "Cancel · Title · Done" header used by picker sheets. */
export function SheetToolbar({ title, onDone, doneLabel = 'Done', onCancel = close }: SheetToolbarProps) {
  return (
    <View style={styles.toolbar}>
      <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={8} style={styles.toolbarButton}>
        <Text weight="semibold" muted>
          Cancel
        </Text>
      </Pressable>
      <Text accessibilityRole="header" weight="bold" size={17}>
        {title}
      </Text>
      <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8} style={styles.toolbarButton}>
        <Text weight="bold">{doneLabel}</Text>
      </Pressable>
    </View>
  );
}

type DialogProps = {
  icon: IconName;
  tone?: 'danger' | 'neutral';
  title: string;
  message?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
};

/** Centred alert dialog (delete, remove member, sign out, low stock). */
export function Dialog({ icon, tone = 'danger', title, message, children, onClose = close }: DialogProps) {
  return (
    <View style={styles.root}>
      <Scrim onPress={onClose} />
      <View style={[styles.dialogArea, styles.passThrough]}>
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          entering={FadeInDown.duration(260).easing(EASE_OUT)}
          style={styles.dialog}>
          <View style={[styles.dialogIcon, tone === 'neutral' && { backgroundColor: Palette.muted }]}>
            <Icon name={icon} size={22} color={tone === 'danger' ? Palette.danger : Palette.ink} />
          </View>
          <Text accessibilityRole="header" display size={22} style={styles.headerTitle}>
            {title}
          </Text>
          {typeof message === 'string' ? (
            <Text size={14} muted style={styles.message}>
              {message}
            </Text>
          ) : (
            message
          )}
          <View style={styles.dialogActions}>{children}</View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrim: {
    backgroundColor: Palette.scrim,
  },
  /** Lets taps on empty space reach the scrim underneath. */
  passThrough: {
    pointerEvents: 'box-none',
  },
  sheetArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '94%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: '0 -12px 40px rgba(47,47,47,0.18)',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.line,
    marginTop: 10,
    marginBottom: 6,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  grow: {
    flexGrow: 1,
  },
  centered: {
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    flexShrink: 1,
    lineHeight: 28,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbarButton: {
    height: 40,
    justifyContent: 'center',
  },
  dialogArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    backgroundColor: Palette.surface,
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    boxShadow: '0 24px 60px rgba(47,47,47,0.25)',
  },
  dialogIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    lineHeight: 21,
  },
  dialogActions: {
    gap: 8,
    marginTop: 4,
  },
});
