import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import type { ApiTrip, ApiTripItem } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/controls';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { formatClock } from '@/lib/dates';
import { formatAmountInput, formatNaira, parseAmount } from '@/lib/money';
import { useHousehold } from '@/state/household';
import { canSeeShoppingTotals } from '@/state/permissions';
import { currentUser } from '@/state/selectors';

/** D06 — "Edit shopping record" (Admins): correct the amount and which items were bought. */
export default function EditTripSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const [trip, setTrip] = useState<(ApiTrip & { items: ApiTripItem[] }) | null>(null);
  const [spent, setSpent] = useState('');
  const [bought, setBought] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    actions
      .trip(id)
      .then(({ trip: loaded }) => {
        if (!live) return;
        setTrip(loaded);
        setSpent(formatAmountInput(String(loaded.spent)));
        setBought(new Set(loaded.items.filter((i) => i.bought).map((i) => i.id)));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [actions, id]);

  if (!me || !canSeeShoppingTotals(me)) {
    return (
      <Sheet>
        <SheetHeader title="Edit shopping record" />
        <Text muted>Only admins can edit shopping records.</Text>
      </Sheet>
    );
  }

  const save = async () => {
    if (!trip) return;
    setSaving(true);
    try {
      await actions.updateTrip(trip.id, { spent: parseAmount(spent), boughtItemIds: [...bought] });
      router.back();
    } catch (error) {
      Alert.alert("Couldn't save that", error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet>
      <SheetHeader title="Edit shopping record" />
      {!trip ? (
        <ActivityIndicator color={Palette.ink} />
      ) : (
        <>
          <TextField
            label="Amount spent"
            value={spent}
            onChangeText={(value) => setSpent(formatAmountInput(value))}
            keyboardType="number-pad"
            prefix="₦"
            fontSize={18}
            bold
            hint={
              trip.enteredByName
                ? `Entered by ${trip.enteredByName} at ${formatClock(new Date(trip.finishedAt))}.`
                : undefined
            }
          />
          <View>
            <Text weight="bold" size={13}>
              What was bought
            </Text>
            {trip.items.map((item) => {
              const checked = bought.has(item.id);
              const toggle = () =>
                setBought((now) => {
                  const next = new Set(now);
                  if (checked) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                });
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  onPress={toggle}
                  style={styles.line}>
                  <Checkbox checked={checked} size={20} />
                  <Text weight="semibold" size={14} style={styles.flex}>
                    {item.name}
                  </Text>
                  <Text size={13} muted>
                    {item.lineTotal != null ? formatNaira(item.lineTotal) : 'No price'}
                  </Text>
                </Pressable>
              );
            })}
            <Text size={12} muted style={styles.note}>
              Unticked items stay on the shopping list.
            </Text>
          </View>
          <Button label="Save changes" disabled={saving} onPress={save} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  note: {
    paddingTop: 6,
  },
});
