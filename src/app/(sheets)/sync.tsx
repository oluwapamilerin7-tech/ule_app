import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SegmentsText } from '@/components/segments-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { memberById } from '@/state/selectors';

/** S07 — offline changes & conflict resolution (FR-12). */
export default function SyncSheet() {
  const { state, actions } = useHousehold();
  const { pending, online, lastSynced } = state.sync;
  const conflict = pending.find((p) => p.conflict);
  const other = conflict?.conflict ? memberById(state, conflict.conflict.otherMemberId) : undefined;

  if (pending.length === 0) {
    return (
      <Sheet>
        <SheetHeader title={online ? 'All synced' : "You're offline"} />
        <View style={styles.synced}>
          <Icon name={online ? 'check' : 'wifi-off'} size={20} />
          <Text size={14} muted style={styles.flex}>
            {online
              ? `Everything on this phone is up to date. Last synced ${lastSynced}.`
              : `Ulé can't reach the server right now. Changes you make are kept and sent when you're back online. Last synced ${lastSynced}.`}
          </Text>
        </View>
        {online ? (
          <Button label="Close" variant="outline" onPress={() => router.back()} />
        ) : (
          <Button label="Try again" icon="sync" onPress={() => void actions.syncNow()} />
        )}
      </Sheet>
    );
  }

  return (
    <Sheet>
      <SheetHeader title="Saved on this phone" />
      <Text size={14} muted style={styles.intro}>
        {online ? 'These changes are waiting to sync.' : "You're offline. These changes will sync automatically when you're back online."}{' '}
        Last synced {lastSynced}.
      </Text>

      <View style={styles.list}>
        {pending.map((change, index) => (
          <View
            key={change.id}
            style={[
              styles.row,
              index > 0 && styles.divider,
              change.conflict && styles.conflict,
              change.conflict && index === pending.length - 1 && styles.conflictLast,
            ]}>
            <Icon
              name={change.conflict ? 'alert' : 'sync'}
              size={18}
              color={change.conflict ? Palette.danger : Palette.slate}
            />
            <View style={styles.flex}>
              <SegmentsText segments={change.body} size={change.conflict ? 14 : 15} />
            </View>
            {change.conflict ? null : (
              <Text size={12} muted>
                {change.when}
              </Text>
            )}
          </View>
        ))}
      </View>

      {conflict ? (
        <View style={styles.pair}>
          <Button
            label={other ? `Keep ${other.name}'s` : 'Keep theirs'}
            variant="outline"
            size="sm"
            onPress={() => actions.resolveConflict(conflict.id)}
            style={styles.flex}
          />
          <Button
            label="Keep mine"
            variant="dark"
            size="sm"
            onPress={() => void actions.keepMine(conflict.id)}
            style={styles.flex}
          />
        </View>
      ) : null}

      {pending.some((p) => !p.conflict) ? (
        <Button
          label="Try syncing now"
          icon="sync"
          onPress={() => {
            void actions.syncNow();
            router.back();
          }}
        />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  intro: {
    marginTop: -6,
    lineHeight: 21,
  },
  synced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  list: {
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  conflict: {
    backgroundColor: Palette.coralTint,
  },
  conflictLast: {
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  pair: {
    flexDirection: 'row',
    gap: 10,
  },
});
