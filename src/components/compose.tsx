import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { canAddToShoppingList, canCreateEvents, canCreateTasks, canSendRequests } from '@/state/permissions';
import { currentUser } from '@/state/selectors';
import type { Member } from '@/state/types';

type ComposeHeaderProps = {
  title: string;
  onSave: () => void;
  canSave: boolean;
  saveTone?: 'dark' | 'coral';
};

/** "Cancel · New task · Save" bar at the top of the full-screen compose forms. */
export function ComposeHeader({ title, onSave, canSave, saveTone = 'dark' }: ComposeHeaderProps) {
  const insets = useSafeAreaInsets();
  // iOS shows these as page sheets, which already sit below the status bar.
  const top = Platform.OS === 'ios' ? 0 : insets.top;
  return (
    <View style={[styles.header, { paddingTop: 16 + top }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        style={styles.cancel}>
        <Text weight="semibold" muted>
          Cancel
        </Text>
      </Pressable>
      <Text accessibilityRole="header" weight="bold" size={17}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={onSave}
        style={[
          styles.save,
          { backgroundColor: saveTone === 'dark' ? Palette.ink : Palette.coral },
          !canSave && styles.disabled,
        ]}>
        <Text weight="bold" color={saveTone === 'dark' ? Palette.white : Palette.ink}>
          Save
        </Text>
      </Pressable>
    </View>
  );
}

type Kind = 'task' | 'event' | 'item' | 'request';

const KINDS: { kind: Kind; label: string; href: '/new-task' | '/new-event' | '/add-item' | '/request-items' }[] = [
  { kind: 'task', label: 'Task', href: '/new-task' },
  { kind: 'event', label: 'Event', href: '/new-event' },
  { kind: 'item', label: 'Shopping item', href: '/add-item' },
  { kind: 'request', label: 'Shopping list', href: '/request-items' },
];

/** What this person's quick-add button can create, by role. */
export function composeKinds(me: Member | undefined): Kind[] {
  if (!me) return [];
  return KINDS.map((k) => k.kind).filter((kind) => {
    if (kind === 'task') return canCreateTasks(me);
    if (kind === 'event') return canCreateEvents(me);
    if (kind === 'item') return canAddToShoppingList(me);
    return !canAddToShoppingList(me) && canSendRequests(me);
  });
}

export function composeHref(kind: Kind) {
  return KINDS.find((k) => k.kind === kind)!.href;
}

/** Switches between the things this person's quick-add button can create. */
export function ComposeKinds({ current }: { current: Kind }) {
  const { state } = useHousehold();
  const kinds = composeKinds(currentUser(state));
  if (kinds.length < 2) return null;
  return (
    <View accessibilityRole="tablist" accessibilityLabel="What are you adding" style={styles.kinds}>
      {KINDS.filter((k) => kinds.includes(k.kind)).map((k) => (
        <Chip
          key={k.kind}
          label={k.label}
          height={32}
          selected={current === k.kind}
          onPress={() => {
            if (k.kind !== current) router.replace(k.href);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  cancel: {
    height: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  save: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  kinds: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
});
