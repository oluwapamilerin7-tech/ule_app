import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Avatar, Chip, Segmented, Stepper } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { formatAmountInput, formatNaira, parseAmount } from '@/lib/money';
import { storeCode } from '@/state/adapters';
import { OFTEN_BOUGHT } from '@/state/demo-data';
import { useHousehold } from '@/state/household';
import { canAddToShoppingList, canEditItem, canSetPrices } from '@/state/permissions';
import { currentUser, lineTotal, memberById, shoppingTotals } from '@/state/selectors';
import type { Store } from '@/state/types';

const UNITS = ['kg', 'paint', 'bag', 'pack', 'carton', 'litres', 'pieces'];
const STORES = (['Market', 'Supermarket', 'Other'] as const).map((value) => ({ value, label: value }));

/** M09 — add (or edit) a shopping item with an amount (FR-08). */
export default function AddItemSheet() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const { state, actions } = useHousehold();
  const editing = params.id ? state.shopping.find((item) => item.id === params.id) : undefined;

  const [name, setName] = useState(editing?.name ?? params.name ?? '');
  const [qty, setQty] = useState(editing?.qty ?? 1);
  const [unit, setUnit] = useState(editing?.unit ?? 'paint');
  const [amount, setAmount] = useState(editing?.unitPrice != null ? formatAmountInput(String(editing.unitPrice)) : '');
  const [store, setStore] = useState<Store>(editing?.store ?? 'Market');

  const unitPrice = parseAmount(amount);
  const itemTotal = unitPrice * qty;
  const totals = shoppingTotals(state);
  const newListTotal = totals.total - (editing ? lineTotal(editing) : 0) + itemTotal;
  const shopper = memberById(state, state.shopper.memberId);
  const units = UNITS.includes(unit) ? UNITS : [unit, ...UNITS];

  const query = name.trim().toLowerCase();
  const suggestions =
    query.length >= 2
      ? OFTEN_BOUGHT.filter((item) => item.toLowerCase().includes(query) && item.toLowerCase() !== query).slice(0, 3)
      : [];

  const me = currentUser(state);
  // Only Admins add straight to the list or set prices; others edit what they added (E07).
  const admin = !!me && canAddToShoppingList(me);
  const prices = !!me && canSetPrices(me);
  const admins = state.members.filter((m) => m.role === 'admin').map((m) => m.name);

  if (!me || (!editing && !admin) || (editing && !canEditItem(me, editing))) {
    return (
      <Sheet>
        <SheetHeader title="Shopping" />
        <Text size={14} muted>
          Only an admin adds straight to the list. Send a shopping list for approval instead.
        </Text>
        <Button label="Create shopping list" onPress={() => router.replace('/request-items')} />
      </Sheet>
    );
  }

  const save = () => {
    void actions.saveShoppingItem(
      {
        name: name.trim(),
        qty,
        unit,
        store: storeCode(store),
        ...(prices ? { unitPrice: unitPrice || null, buyerId: state.shopper.memberId || null } : {}),
      },
      editing?.id,
    );
    router.back();
  };

  return (
    <Sheet>
      <SheetHeader title={editing ? 'Edit item' : 'Add to the list'} />
      {editing && editing.addedBy === me.id && !admin ? (
        <Text size={13} muted>
          Added by you
        </Text>
      ) : null}

      <View style={styles.field}>
        <TextField
          label="Item"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Garri"
          autoFocus={!editing && !params.name}
          autoCapitalize="sentences"
          fontSize={17}
          bold
        />
        {suggestions.length ? (
          <View style={styles.wrap}>
            <Text size={12} muted>
              Often bought:
            </Text>
            {suggestions.map((suggestion) => (
              <Chip key={suggestion} label={suggestion} height={30} onPress={() => setName(suggestion)} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text weight="bold" size={13}>
          How much?
        </Text>
        <View style={styles.qtyRow}>
          <Stepper label="quantity" value={qty} onChange={setQty} min={1} max={99} />
          <View style={[styles.wrap, styles.flex]}>
            {units.map((option) => (
              <Chip key={option} label={option} height={36} selected={unit === option} onPress={() => setUnit(option)} />
            ))}
          </View>
        </View>
      </View>

      {prices ? (
      <View style={styles.field}>
        <View style={styles.amountRow}>
          <TextField
            label="Amount"
            labelNote={`(price per ${unit}, optional)`}
            value={amount}
            onChangeText={(value) => setAmount(formatAmountInput(value))}
            keyboardType="number-pad"
            prefix="₦"
            placeholder="0"
            fontSize={18}
            bold
            style={styles.flex}
          />
          <View style={styles.itemTotal}>
            <Text size={12} muted>
              Item total
            </Text>
            <Text weight="bold" size={17}>
              {formatNaira(itemTotal)}
            </Text>
          </View>
        </View>
        <Text size={12} muted>
          List total becomes{' '}
          <Text weight="bold" size={12}>
            {formatNaira(newListTotal)}
          </Text>{' '}
          of your {formatNaira(state.household.budget)} budget.
        </Text>
      </View>
      ) : (
        <Text size={13} muted>
          Prices are set by {admins.join(' or ') || 'an admin'}.
        </Text>
      )}

      <View style={styles.field}>
        <Text weight="bold" size={13}>
          Where to buy
        </Text>
        <Segmented label="Where to buy" options={STORES} value={store} onChange={setStore} height={38} fontSize={14} />
      </View>

      {admin ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/shopper')}
          style={({ pressed }) => [styles.shopper, pressed && { backgroundColor: Palette.muted }]}>
          {shopper ? <Avatar person={shopper} size={32} /> : null}
          <View style={styles.flex}>
            <Text size={12} muted>
              {"Who's buying"}
            </Text>
            <Text weight="semibold">
              {shopper ? `${shopper.name} (${state.shopper.when.toLowerCase()}'s shopper)` : 'Choose a shopper'}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={Palette.slate} />
        </Pressable>
      ) : null}

      <Button
        label={
          editing
            ? 'Save item'
            : itemTotal
              ? `Add item · ${formatNaira(itemTotal)}`
              : 'Add item'
        }
        disabled={!name.trim()}
        onPress={save}
      />
      {editing ? (
        <Button
          label={admin ? 'Remove from list' : 'Delete item'}
          variant="danger-outline"
          size="md"
          onPress={() => {
            actions.removeShoppingItem(editing.id);
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
    alignItems: 'center',
    gap: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  itemTotal: {
    alignItems: 'flex-end',
    paddingBottom: 12,
  },
  shopper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
