import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { formatAmountInput, formatNaira, parseAmount } from '@/lib/money';
import { useHousehold } from '@/state/household';
import { canFinishShopping } from '@/state/permissions';
import { currentUser, lineTotal, quantityLabel } from '@/state/selectors';

/**
 * "Done shopping?" (E07 / G01b / C11): what was bought, what stays on the list, and how much was
 * spent. Finishing records the trip in Shopping history and tells the Admins.
 */
export default function DoneShoppingSheet() {
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const bought = state.shopping.filter((i) => i.inBasket);
  const left = state.shopping.filter((i) => !i.inBasket);
  const estimate = bought.reduce((sum, i) => sum + lineTotal(i), 0);
  const [spent, setSpent] = useState(estimate ? formatAmountInput(String(estimate)) : '');
  const [saving, setSaving] = useState(false);
  const admins = state.members.filter((m) => m.role === 'admin' && m.id !== me?.id).map((m) => m.name);

  if (!me || !canFinishShopping(state, me)) {
    return (
      <Sheet>
        <SheetHeader title="Done shopping?" />
        <Text muted>{"Only today's shopper or an admin can finish a shopping trip."}</Text>
      </Sheet>
    );
  }

  const finish = async () => {
    setSaving(true);
    try {
      await actions.finishShopping(parseAmount(spent));
      router.back();
    } catch (error) {
      Alert.alert("Couldn't finish shopping", error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet>
      <SheetHeader title="Done shopping?" />

      <View>
        <Text weight="bold" size={12} muted style={styles.caps}>
          You bought {bought.length} of {state.shopping.length} {state.shopping.length === 1 ? 'item' : 'items'}
        </Text>
        {bought.map((item) => (
          <View key={item.id} style={styles.line}>
            <Icon name="check" size={16} />
            <Text weight="semibold" size={14} style={styles.flex}>
              {item.name}{' '}
              <Text weight="medium" size={14} muted>
                · {quantityLabel(item)}
              </Text>
            </Text>
            <Text weight="bold" size={14}>
              {item.unitPrice != null ? formatNaira(lineTotal(item)) : 'No price'}
            </Text>
          </View>
        ))}
        <View style={styles.estimate}>
          <Text size={13} muted>
            Estimate for these
          </Text>
          <Text weight="bold" size={13}>
            {formatNaira(estimate)}
          </Text>
        </View>
      </View>

      {left.length ? (
        <View style={styles.left}>
          <Text weight="bold" size={13}>
            Not bought · stays on the list
          </Text>
          {left.map((item) => (
            <View key={item.id} style={styles.leftLine}>
              <View style={styles.ring} />
              <Text size={14} muted>
                {item.name} · {quantityLabel(item)}
                {item.boughtQty > 0 ? ` (bought ${item.boughtQty}, ${item.qty - item.boughtQty} left)` : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <TextField
        label="How much did you spend in total?"
        value={spent}
        onChangeText={(value) => setSpent(formatAmountInput(value))}
        keyboardType="number-pad"
        prefix="₦"
        placeholder="0"
        fontSize={20}
        bold
        hint={
          me.role === 'admin'
            ? 'This goes into Shopping history.'
            : `${admins.join(' and ') || 'The admins'} will be told. Only they can change it later.`
        }
      />

      <Button label="Finish shopping" disabled={saving || !spent} onPress={finish} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  caps: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  estimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  left: {
    backgroundColor: Palette.muted,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  leftLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  ring: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Palette.grey,
  },
});
