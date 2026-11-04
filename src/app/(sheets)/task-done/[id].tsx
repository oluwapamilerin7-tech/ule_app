import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { memberById } from '@/state/selectors';

/** M02 — task completed, with the next occurrence of a recurring task. */
export default function TaskDoneSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  const [markAvailable, setMarkAvailable] = useState(true);
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return <NotFoundSheet what="Task" />;

  const assignee = memberById(state, task.assigneeId);
  const creator = memberById(state, task.createdBy);
  const stock = state.inventory.find((i) => i.id === task.linkedInventoryId);
  const offerRestock = !!stock && stock.status !== 'available';
  const doneBy = assignee && assignee.id !== state.currentUserId ? assignee.name : 'you';
  const told = creator && creator.id !== state.currentUserId ? ` ${creator.name} has been told.` : '';

  const finish = () => {
    if (offerRestock && markAvailable) actions.setInventoryStatus(stock.id, 'available');
    router.back();
  };

  return (
    <Sheet centered>
      <View style={styles.badge}>
        <Icon name="check" size={36} strokeWidth={2.4} />
      </View>
      <Text accessibilityRole="header" display size={24} style={styles.center}>
        {task.title}
      </Text>
      <Text size={15} muted style={styles.center}>
        Marked done by {doneBy} at {task.doneAt ?? 'just now'}.{told}
      </Text>

      {task.repeat ? (
        <View style={styles.next}>
          <Icon name="repeat" size={22} color={Palette.slate} />
          <View style={styles.flex}>
            <Text size={12} muted>
              Next one scheduled
            </Text>
            <Text weight="bold">
              {task.nextLabel ?? task.repeat} · {assignee?.name ?? 'Unassigned'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace({ pathname: '/new-task', params: { id: task.id } })}
            hitSlop={8}>
            <Text weight="bold" size={13}>
              Change
            </Text>
          </Pressable>
        </View>
      ) : null}

      {offerRestock ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: markAvailable }}
          onPress={() => setMarkAvailable((value) => !value)}
          style={styles.restock}>
          <Checkbox checked={markAvailable} size={20} />
          <Text size={14} style={styles.flex}>
            Also mark{' '}
            <Text weight="bold" size={14}>
              {stock.name}
            </Text>{' '}
            as Available in Supplies
          </Text>
        </Pressable>
      ) : null}

      <Button label="Done" onPress={finish} style={styles.full} />
      <Button
        label="Undo"
        variant="ghost"
        size="sm"
        onPress={() => {
          actions.undoTask(task.id);
          router.back();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  center: {
    textAlign: 'center',
    lineHeight: 24,
  },
  next: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.muted,
    borderRadius: 16,
    padding: 14,
  },
  restock: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  full: {
    alignSelf: 'stretch',
  },
});
