import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/card';
import { Stepper } from '@/components/ui/controls';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { formatAmountInput, parseAmount } from '@/lib/money';
import { useHousehold } from '@/state/household';
import { canReviewRequests } from '@/state/permissions';
import { currentUser } from '@/state/selectors';

/** D01b — an Admin edits one line of a list sent for approval: name, quantity, category, price. */
export default function ReviewItemSheet() {
  const { requestId, itemId } = useLocalSearchParams<{ requestId: string; itemId: string }>();
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const request = state.requests.find((r) => r.id === requestId);
  const item = request?.items.find((i) => i.id === itemId);

  const [name, setName] = useState(item?.name ?? '');
  const [qty, setQty] = useState(item?.qty ?? 1);
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [price, setPrice] = useState(item?.unitPrice != null ? formatAmountInput(String(item.unitPrice)) : '');
  const [saving, setSaving] = useState(false);

  if (!request || !item || !me) return <NotFoundSheet what="Item" />;
  if (!canReviewRequests(me) || request.status !== 'pending') {
    return (
      <Sheet>
        <SheetHeader title="Edit item" />
        <Text muted>Only an admin can change a list that is waiting for approval.</Text>
      </Sheet>
    );
  }

  const run = async (work: () => Promise<unknown>) => {
    setSaving(true);
    try {
      await work();
      router.back();
    } catch (error) {
      Alert.alert("Couldn't save that", error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const save = () =>
    run(() =>
      actions.updateRequestItem(request.id, item.id, {
        name: name.trim(),
        qty,
        unit: unit.trim() || null,
        category: category.trim() || null,
        unitPrice: price ? parseAmount(price) : null,
      }),
    );

  const remove = () =>
    Alert.alert(`Remove ${item.name}?`, `It won't be added when you approve ${request.requesterName}'s list.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(() => actions.removeRequestItem(request.id, item.id)) },
    ]);

  return (
    <Sheet>
      <View style={styles.title}>
        <Tag
          label={`FROM ${request.requesterName.toUpperCase()}'S LIST`}
          background={Palette.slateTint}
          color={Palette.slateDeep}
          size={11}
        />
        <SheetHeader title="Edit item" />
      </View>

      <TextField label="Item" labelStyle="caps" value={name} onChangeText={setName} fontSize={15} />

      <View style={styles.row}>
        <View style={styles.field}>
          <Text weight="bold" size={12} muted style={styles.caps}>
            Quantity
          </Text>
          <Stepper label="quantity" value={qty} onChange={setQty} min={1} max={999} compact />
        </View>
        <TextField
          label="Unit"
          labelStyle="caps"
          value={unit}
          onChangeText={setUnit}
          placeholder="e.g. paint"
          fontSize={15}
          style={styles.flex}
        />
      </View>

      <TextField
        label="Category"
        labelStyle="caps"
        value={category}
        onChangeText={setCategory}
        placeholder="e.g. Pantry"
        fontSize={15}
      />

      <TextField
        label="Price (₦)"
        labelStyle="caps"
        value={price}
        onChangeText={(value) => setPrice(formatAmountInput(value))}
        keyboardType="number-pad"
        prefix="₦"
        placeholder="0"
        fontSize={17}
        bold
        hint={`Price per ${unit.trim() || 'item'}. The shopper will see it but can't change it.`}
      />

      <Text size={12} muted>
        {request.requesterName} will see your changes when the list is approved.
      </Text>

      <Button label="Save" disabled={saving || !name.trim()} onPress={save} />
      <Button label="Remove from list" variant="ghost" disabled={saving} onPress={remove} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  title: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  field: {
    gap: 6,
  },
  caps: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
