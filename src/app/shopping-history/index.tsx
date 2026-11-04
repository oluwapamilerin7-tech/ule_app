import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { ApiTrip, ApiTripMonth } from '@/api/types';
import { Card, SectionLabel } from '@/components/ui/card';
import { Avatar, Chip } from '@/components/ui/controls';
import { BackButton, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { formatNaira } from '@/lib/money';
import { differenceLabel, tripDate } from '@/lib/trips';
import { useHousehold } from '@/state/household';
import { canSeeShoppingTotals } from '@/state/permissions';
import { currentUser, memberById } from '@/state/selectors';

/** D04 — Shopping history (Admins only): every "Done shopping" trip, by month and by shopper. */
export default function ShoppingHistoryScreen() {
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const [shopperId, setShopperId] = useState<string | undefined>();
  const [data, setData] = useState<{ months: ApiTripMonth[]; trips: ApiTrip[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const admins = state.members.filter((m) => m.role === 'admin').map((m) => m.name);

  // Refetch when coming back from an edited trip.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      actions
        .trips(shopperId)
        .then((result) => {
          if (live) {
            setData(result);
            setFailed(false);
          }
        })
        .catch(() => {
          if (live) setFailed(true);
        });
      return () => {
        live = false;
      };
    }, [actions, shopperId]),
  );

  if (!me || !canSeeShoppingTotals(me)) {
    return (
      <Screen>
        <BackButton fallback="/home" />
        <Text muted>Only admins can see shopping history.</Text>
      </Screen>
    );
  }

  const latest = data?.months[0];

  return (
    <Screen gap={16}>
      <View style={styles.header}>
        <BackButton fallback="/shopping" />
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={26}>
            Shopping history
          </Text>
          <Text size={13} muted>
            Only {admins.join(' and ')} can see this
          </Text>
        </View>
      </View>

      {latest ? (
        <View style={styles.month}>
          <Text weight="semibold" size={12} color={Palette.line}>
            {latest.label} · {latest.tripCount} shopping {latest.tripCount === 1 ? 'trip' : 'trips'}
          </Text>
          <Text display size={32} color={Palette.white} style={styles.monthValue}>
            {formatNaira(latest.spent)} spent
          </Text>
          <Text size={12} color={Palette.line}>
            {latest.difference === 0 ? 'Right on the estimates' : `${differenceLabel(latest.difference)} the estimates`}
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip label="All" selected={!shopperId} onPress={() => setShopperId(undefined)} />
        {state.members.map((m) => (
          <Chip key={m.id} label={m.name} selected={shopperId === m.id} onPress={() => setShopperId(m.id)} />
        ))}
      </ScrollView>

      {!data && !failed ? <ActivityIndicator color={Palette.ink} /> : null}
      {failed ? (
        <Card padded>
          <Text size={14} muted>
            {"Couldn't load shopping history. Check your connection and try again."}
          </Text>
        </Card>
      ) : null}
      {data && data.trips.length === 0 ? (
        <Card padded>
          <Text size={14} muted>
            {shopperId ? 'No shopping trips by this person yet.' : 'No shopping trips yet. They appear here after "Done shopping".'}
          </Text>
        </Card>
      ) : null}

      {data?.months.map((month) => {
        const trips = data.trips.filter((t) => {
          const d = new Date(t.finishedAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month.month;
        });
        if (!trips.length) return null;
        return (
          <View key={month.month} style={styles.section}>
            <SectionLabel title={month.label} />
            <Card divided>
              {trips.map((trip) => {
                const shopper = memberById(state, trip.shopperId);
                return (
                  <Pressable
                    key={trip.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/shopping-history/${trip.id}`)}
                    style={({ pressed }) => [styles.trip, pressed && { backgroundColor: Palette.muted }]}>
                    {shopper ? <Avatar person={shopper} size={34} /> : null}
                    <View style={styles.flex}>
                      <Text weight="bold">{tripDate(trip.finishedAt)}</Text>
                      <Text size={12} muted>
                        {trip.shopperName ?? 'Someone'} · {trip.boughtCount} of {trip.itemCount} bought
                      </Text>
                    </View>
                    <View style={styles.amount}>
                      <Text weight="bold">{formatNaira(trip.spent)}</Text>
                      <Text size={11} muted>
                        {differenceLabel(trip.difference)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        );
      })}
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
  month: {
    backgroundColor: Palette.ink,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  monthValue: {
    letterSpacing: -0.5,
  },
  filters: {
    gap: 8,
  },
  section: {
    gap: 8,
  },
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  amount: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
