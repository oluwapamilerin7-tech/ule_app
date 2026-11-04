import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, InfoNote, Row } from '@/components/ui/card';
import { Checkbox, Chip, Stepper } from '@/components/ui/controls';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Palette } from '@/constants/theme';
import { formatAmountInput, parseAmount } from '@/lib/money';
import { useHousehold } from '@/state/household';
import { canManageInventory } from '@/state/permissions';
import { currentUser } from '@/state/selectors';
import type { StockStatus } from '@/state/types';

const DEFAULT_GROUPS = ['Pantry', 'Kitchen', 'Cleaning', 'Power', 'Bathroom'];
const UNITS = ['litres', 'kg', 'pieces', 'packs', 'cartons', 'bags'];
const STATUSES: { value: StockStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'low', label: 'Low' },
  { value: 'out', label: 'Out' },
];

/** M11 — add an inventory item (MVP-15), or edit one (Admins: "Tap an item to edit its price"). */
export default function AddInventorySheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const editing = id ? state.inventory.find((i) => i.id === id) : undefined;
  const existingGroups = Array.from(new Set([...DEFAULT_GROUPS, ...state.inventory.map((i) => i.group)]));

  const [name, setName] = useState(editing?.name ?? '');
  const [groups, setGroups] = useState(existingGroups);
  const [group, setGroup] = useState(editing?.group ?? 'Pantry');
  const [newGroup, setNewGroup] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [unit, setUnit] = useState(editing?.unit ?? editing?.restockUnit ?? 'pieces');
  const [status, setStatus] = useState<StockStatus>(editing?.status ?? 'available');
  const [autoAdd, setAutoAdd] = useState(editing?.autoAddWhenLow ?? true);
  const [price, setPrice] = useState(editing?.price != null ? formatAmountInput(String(editing.price)) : '');
  const [pricePer, setPricePer] = useState(editing?.pricePer ?? '');
  const units = UNITS.includes(unit) ? UNITS : [unit, ...UNITS];
  const staff = state.members.filter((m) => m.role === 'staff' && m.canUpdateSupplies).map((m) => m.name);

  if (!me || !canManageInventory(me)) {
    return (
      <Sheet>
        <SheetHeader title="Inventory" />
        <Text size={14} muted>
          Only an admin can add items or set prices.
        </Text>
      </Sheet>
    );
  }

  const addGroup = () => {
    const label = newGroup?.trim();
    if (label) {
      setGroups((list) => (list.includes(label) ? list : [...list, label]));
      setGroup(label);
    }
    setNewGroup(null);
  };

  const save = () => {
    const amount = parseAmount(price);
    const priced = { price: amount || null, pricePer: amount ? pricePer.trim() || null : null };
    if (editing) {
      void actions.updateInventoryItem(editing.id, {
        name: name.trim(),
        group,
        status,
        autoAddWhenLow: autoAdd,
        quantity,
        unit,
        ...priced,
      });
    } else {
      void actions.saveInventoryItem({
        name: name.trim(),
        group,
        status,
        autoAddWhenLow: autoAdd,
        quantity,
        unit,
        restockUnit: unit,
        restockQty: Math.max(1, quantity),
        ...priced,
      });
    }
    router.back();
  };

  return (
    <Sheet>
      <SheetHeader title={editing ? 'Edit inventory item' : 'Add inventory item'} />

      <TextField
        label="What is it?"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Engine oil (generator)"
        autoFocus={!editing}
        fontSize={17}
        bold
      />

      <View style={styles.field}>
        <Text weight="bold" size={13}>
          Group
        </Text>
        <View style={styles.wrap}>
          {groups.map((option) => (
            <Chip key={option} label={option} height={36} selected={group === option} onPress={() => setGroup(option)} />
          ))}
          {newGroup === null ? (
            <Chip label="+ New" height={36} dashed onPress={() => setNewGroup('')} />
          ) : (
            <TextInput
              value={newGroup}
              onChangeText={setNewGroup}
              onSubmitEditing={addGroup}
              onBlur={addGroup}
              autoFocus
              placeholder="New group"
              placeholderTextColor={Palette.grey}
              accessibilityLabel="New group name"
              returnKeyType="done"
              style={styles.newGroup}
            />
          )}
        </View>
      </View>

      <View style={styles.field}>
        <Text weight="bold" size={13}>
          Quantity in the house
        </Text>
        <View style={styles.qtyRow}>
          <Stepper label="quantity" value={quantity} onChange={setQuantity} min={0} max={999} />
          <View style={[styles.wrap, styles.flex]}>
            {units.map((option) => (
              <Chip key={option} label={option} height={36} selected={unit === option} onPress={() => setUnit(option)} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.qtyRow}>
          <TextField
            label="Price (₦)"
            value={price}
            onChangeText={(value) => setPrice(formatAmountInput(value))}
            keyboardType="number-pad"
            prefix="₦"
            placeholder="0"
            fontSize={18}
            bold
            style={styles.flex}
          />
          <TextField
            label="Per"
            labelNote="(optional)"
            value={pricePer}
            onChangeText={setPricePer}
            placeholder={unit.replace(/s$/, '')}
            fontSize={16}
            style={styles.flex}
          />
        </View>
        <InfoNote icon="lock" tone="plain">
          <Text size={12} muted>
            Hidden from staff and children.
          </Text>
        </InfoNote>
      </View>

      <View style={styles.field}>
        <Text weight="bold" size={13}>
          {"Right now it's"}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.statuses}>
          {STATUSES.map((option) => {
            const selected = option.value === status;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setStatus(option.value)}
                style={[styles.status, selected && styles.statusSelected]}>
                <Text weight={selected ? 'bold' : 'semibold'} size={14} color={selected ? Palette.ink : Palette.slate}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card divided>
        <Row
          title="Add to shopping list when Low"
          subtitle="Otherwise we'll ask first"
          right={<Checkbox checked={autoAdd} onChange={setAutoAdd} label="Add to shopping list when Low" />}
        />
        <Row
          title="Who can update it"
          subtitle={`Adults${staff.length ? ` and ${staff.join(', ')} (staff)` : ''}`}
        />
      </Card>

      <Button label="Save item" disabled={!name.trim()} onPress={save} />
      {editing ? (
        <Button
          label="Remove item"
          variant="danger-outline"
          size="md"
          onPress={() => {
            void actions.removeInventoryItem(editing.id);
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
  field: {
    gap: 6,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  newGroup: {
    height: 36,
    minWidth: 110,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Palette.ink,
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Palette.ink,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statuses: {
    flexDirection: 'row',
    gap: 6,
  },
  status: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  statusSelected: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
    backgroundColor: Palette.divider,
  },
});
