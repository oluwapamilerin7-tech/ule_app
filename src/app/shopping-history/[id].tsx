import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { ApiTrip, ApiTripItem } from '@/api/types';
import { Card, SectionLabel } from '@/components/ui/card';
import { Avatar } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { BackButton, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { formatClock } from '@/lib/dates';
import { formatNaira } from '@/lib/money';
import { differenceLabel, tripDate } from '@/lib/trips';
import { useHousehold } from '@/state/household';
import { canSeeShoppingTotals } from '@/state/permissions';
import { currentUser, memberById } from '@/state/selectors';

type FullTrip = ApiTrip & { items: ApiTripItem[] };

/** D05 — one shopping trip: who, when, spent vs estimate, what was and wasn't bought. */
export default function ShoppingTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const [trip, setTrip] = useState<FullTrip | null>(null);
  const [failed, setFailed] = useState(false);
  const admins = state.members.filter((m) => m.role === 'admin').map((m) => m.name);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      actions
        .trip(id)
        .then(({ trip: loaded }) => {
          if (live) setTrip(loaded);
        })
        .catch(() => {
          if (live) setFailed(true);
        });
      return () => {
        live = false;
      };
    }, [actions, id]),
  );

  if (!me || !canSeeShoppingTotals(me)) {
    return (
      <Screen>
        <BackButton fallback="/home" />
        <Text muted>Only admins can see shopping history.</Text>
      </Screen>
    );
  }
  if (!trip) {
    return (
      <Screen>
        <BackButton fallback="/shopping-history" />
        {failed ? <Text muted>{"This shopping trip isn't available."}</Text> : <ActivityIndicator color={Palette.ink} />}
      </Screen>
    );
  }

  const shopper = memberById(state, trip.shopperId);
  const bought = trip.items.filter((i) => i.bought);
  const notBought = trip.items.filter((i) => !i.bought);
  const finished = new Date(trip.finishedAt);

  const row = (item: ApiTripItem, last: boolean) => (
    <View key={item.id} style={[styles.item, !last && styles.divider]}>
      {item.bought ? <Icon name="check" size={16} /> : <View style={styles.ring} />}
      <View style={styles.flex}>
        <Text weight="semibold" color={item.bought ? Palette.ink : Palette.slate}>
          {item.name}
        </Text>
        <Text size={12} muted>
          {[
            `${item.qty} ${item.unit}`,
            item.requesterName ? `requested by ${item.requesterName}` : null,
            item.fromLowStock ? 'from low stock' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Text weight="bold" size={14} color={item.bought ? Palette.ink : Palette.slate}>
        {item.lineTotal != null ? formatNaira(item.lineTotal) : 'No price'}
      </Text>
    </View>
  );

  return (
    <Screen gap={16}>
      <View style={styles.header}>
        <BackButton fallback="/shopping-history" />
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={22}>
            {tripDate(trip.finishedAt)}
          </Text>
          <Text size={13} muted>
            Shopping list
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/edit-trip/${trip.id}`)}
          style={({ pressed }) => [styles.edit, pressed && { opacity: 0.7 }]}>
          <Icon name="edit" size={15} />
          <Text weight="bold" size={13}>
            Edit
          </Text>
        </Pressable>
      </View>

      <Card padded style={styles.summary}>
        <View style={styles.who}>
          {shopper ? <Avatar person={shopper} size={40} /> : null}
          <View style={styles.flex}>
            <Text weight="bold">Shopped by {trip.shopperName ?? 'someone'}</Text>
            <Text size={12} muted>
              Finished at {formatClock(finished)}
              {trip.enteredByName ? ` · entered by ${trip.enteredByName}` : ''}
              {trip.editedByName ? ` · edited by ${trip.editedByName}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.tiles}>
          <View style={[styles.tile, styles.tileDark]}>
            <Text weight="semibold" size={12} color={Palette.line}>
              Amount spent
            </Text>
            <Text display size={24} color={Palette.white}>
              {formatNaira(trip.spent)}
            </Text>
          </View>
          <View style={[styles.tile, styles.tileLight]}>
            <Text weight="semibold" size={12} muted>
              Estimate
            </Text>
            <Text display size={24}>
              {formatNaira(trip.estimate)}
            </Text>
            <Text size={12} muted>
              {differenceLabel(trip.difference)}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionLabel title={`Bought · ${bought.length}`} />
        {bought.length ? (
          <Card>{bought.map((item, index) => row(item, index === bought.length - 1))}</Card>
        ) : (
          <Text size={13} muted>
            Nothing was ticked as bought.
          </Text>
        )}
      </View>

      {notBought.length ? (
        <View style={styles.section}>
          <SectionLabel title={`Not bought · ${notBought.length} — still on the list`} />
          <Card>{notBought.map((item, index) => row(item, index === notBought.length - 1))}</Card>
        </View>
      ) : null}

      <Text size={12} muted>
        Only {admins.join(' and ')} can edit this record.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  edit: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summary: {
    gap: 12,
    borderRadius: 20,
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
  },
  tileDark: {
    backgroundColor: Palette.ink,
  },
  tileLight: {
    backgroundColor: Palette.muted,
  },
  section: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  ring: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Palette.grey,
  },
});
