import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button } from '@/components/ui/button';
import { Checkbox, Stepper } from '@/components/ui/controls';
import { Dialog } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { memberById } from '@/state/selectors';

/** M12 — out of stock → add to the shopping list (US-08). */
export default function LowStockDialog() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  const item = state.inventory.find((i) => i.id === id);
  const [qty, setQty] = useState(item?.restockQty ?? 1);
  const [withTask, setWithTask] = useState(true);
  if (!item) return <NotFoundSheet what="Item" />;

  const updater = memberById(state, item.updatedBy);
  // The task goes to whoever reported it, or to you when nobody has.
  const taskFor = updater ?? memberById(state, state.currentUserId);
  const shortName = item.name.replace(/\s*\(.*\)/, '');
  const statusWord = item.status === 'out' ? 'out' : 'running low';

  return (
    <Dialog
      icon="cart"
      title={`${shortName} is ${statusWord}. Add it to the list?`}
      message={
        updater && item.updatedAt
          ? `${updater.name} marked it ${item.status === 'out' ? 'Out' : 'Low'} at ${item.updatedAt}.`
          : `Qty in the house: ${item.qty}.`
      }>
      <View style={styles.qty}>
        <Text weight="semibold" style={styles.flex}>
          Quantity
        </Text>
        <Stepper
          compact
          label="quantity"
          value={qty}
          onChange={setQty}
          min={1}
          max={500}
          format={(value) => `${value} ${item.restockUnit}`}
        />
      </View>
      {taskFor ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: withTask }}
          onPress={() => setWithTask((value) => !value)}
          style={styles.check}>
          <Checkbox checked={withTask} size={20} />
          <Text size={14} style={styles.flex}>
            Also create a task for {taskFor.id === state.currentUserId ? 'me' : taskFor.name} today
          </Text>
        </Pressable>
      ) : null}
      <Button
        label="Add to shopping list"
        size="md"
        onPress={() => {
          actions.addInventoryToList(item.id, qty, withTask && taskFor ? taskFor.id : null);
          router.back();
        }}
      />
      <Button label="Not now" variant="ghost" size="sm" onPress={() => router.back()} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.muted,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
});
