import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, Tag } from '@/components/ui/card';
import { Chip, Stepper } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { formatNaira } from '@/lib/money';
import { useHousehold } from '@/state/household';
import { canManageInventory, canSendRequests, canViewInventory } from '@/state/permissions';
import { currentUser, memberById, stockCounts } from '@/state/selectors';
import type { InventoryItem, StockStatus } from '@/state/types';

type Filter = 'all' | 'low' | 'out';

const STATUSES: { value: StockStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'low', label: 'Low' },
  { value: 'out', label: 'Out' },
];

/** "₦1,250/litre", or "₦18,500" with no unit. */
function priceLabel(item: InventoryItem) {
  if (item.price == null) return null;
  return `${formatNaira(item.price)}${item.pricePer ? `/${item.pricePer}` : ''}`;
}

/** Inventory (09 Admin with prices, E08 Member read-only prices, 09b Staff without prices). */
export default function InventoryScreen() {
  const { state } = useHousehold();
  const [filter, setFilter] = useState<Filter>('all');
  /** Stocked items open into the full status editor when tapped. */
  const [expanded, setExpanded] = useState<string | null>(null);
  const counts = stockCounts(state);
  const me = currentUser(state);
  if (!me) return null;
  if (!canViewInventory(me)) return <Redirect href="/home" />;
  const manager = canManageInventory(me);
  const admins = state.members.filter((m) => m.role === 'admin').map((m) => m.name);
  const subtitle = manager
    ? 'Tap an item to edit its price'
    : me.role === 'member'
      ? `Prices are set by ${admins.join(' and ')}`
      : 'Update quantity and status as you go';

  const visible = state.inventory.filter((item) => filter === 'all' || item.status === filter);
  // Low/out items that aren't on the list yet (plus whichever row was tapped) get the full card.
  const needsAttention = (item: InventoryItem) =>
    item.id === expanded || item.status === 'out' || (item.status === 'low' && !item.onList);
  const cards = visible.filter(needsAttention);
  const compact = visible.filter((item) => !needsAttention(item));

  return (
    <Screen tabBar gap={12}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={28} style={styles.title}>
            Inventory
          </Text>
          <Text size={13} muted>
            {subtitle}
          </Text>
        </View>
        {manager ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/add-inventory')}
            style={({ pressed }) => [styles.add, pressed && { opacity: 0.8 }]}>
            <Icon name="plus" size={16} />
            <Text weight="bold" size={14}>
              Add
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip label={`All · ${counts.all}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`Low · ${counts.low}`} selected={filter === 'low'} onPress={() => setFilter('low')} />
        <Chip label={`Out · ${counts.out}`} selected={filter === 'out'} onPress={() => setFilter('out')} />
      </ScrollView>

      {visible.length === 0 ? (
        <Card padded>
          <Text size={14} muted>
            {state.inventory.length === 0
              ? 'Track gas, diesel, rice and anything else that runs out. Tap Add to start.'
              : 'Nothing in this filter.'}
          </Text>
        </Card>
      ) : null}

      {cards.map((item) => (
        <StockCard key={item.id} item={item} onCollapse={item.id === expanded ? () => setExpanded(null) : undefined} />
      ))}

      {compact.length > 0 ? (
        <Card divided>
          {compact.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityHint="Change status"
              onPress={() => setExpanded(item.id)}
              style={({ pressed }) => [styles.compact, pressed && { backgroundColor: Palette.muted }]}>
              <View style={styles.flex}>
                <Text weight="semibold">
                  {item.name}
                  {priceLabel(item) ? (
                    <Text weight="medium" muted>
                      {` · ${priceLabel(item)}`}
                    </Text>
                  ) : null}
                </Text>
                <Text size={12} muted>
                  Qty: {item.qty}
                  {item.onList && item.status !== 'available' ? ' · on the list' : ''}
                </Text>
              </View>
              <StatusTag status={item.status} />
            </Pressable>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function StockCard({ item, onCollapse }: { item: InventoryItem; onCollapse?: () => void }) {
  const { state, actions } = useHousehold();
  const me = currentUser(state)!;
  const manager = canManageInventory(me);
  const updater = memberById(state, item.updatedBy);
  const qtyLine = [`Qty: ${item.qty}`, updater && item.updatedAt ? `${updater.name}, ${item.updatedAt}` : null]
    .filter(Boolean)
    .join(' · ');
  const price = priceLabel(item);

  return (
    <Card tone={item.status === 'out' ? 'alert' : 'default'} style={styles.stockCard}>
      <View style={styles.stockTop}>
        <Pressable
          accessibilityRole={manager ? 'button' : undefined}
          accessibilityHint={manager ? 'Edit item and price' : undefined}
          disabled={!manager}
          onPress={() => router.push({ pathname: '/add-inventory', params: { id: item.id } })}
          style={styles.flex}>
          <Text weight="bold">
            {item.name}
            {price ? (
              <Text weight="medium" muted>
                {` · ${price}`}
              </Text>
            ) : null}
          </Text>
          <Text size={12} muted>
            {qtyLine}
          </Text>
        </Pressable>
        {item.onList ? (
          <View style={styles.onList}>
            <Icon name="check" size={14} />
            <Text weight="bold" size={12}>
              On the list
            </Text>
          </View>
        ) : item.status !== 'available' && manager ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/low-stock/${item.id}`)}
            style={styles.addToList}>
            <Text weight="bold" size={12}>
              Add to list
            </Text>
          </Pressable>
        ) : item.status !== 'available' && canSendRequests(me) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Request ${item.name}`}
            onPress={() =>
              router.push({
                pathname: '/request-items',
                params: { name: item.name, inventoryItemId: item.id, unit: item.restockUnit },
              })
            }
            style={styles.addToList}>
            <Text weight="bold" size={12}>
              Request
            </Text>
          </Pressable>
        ) : onCollapse ? (
          <Pressable accessibilityRole="button" onPress={onCollapse} hitSlop={8}>
            <Text weight="semibold" size={12} muted>
              Done
            </Text>
          </Pressable>
        ) : null}
      </View>
      {!manager && item.quantity != null ? (
        <View style={styles.qtyRow}>
          <Text size={13} muted style={styles.flex}>
            Quantity
          </Text>
          <Stepper
            compact
            label={`${item.name} quantity`}
            value={item.quantity}
            min={0}
            max={100000}
            format={(value) => `${value} ${item.unit ?? ''}`.trim()}
            onChange={(quantity) => actions.updateInventoryItem(item.id, { quantity })}
          />
        </View>
      ) : null}
      <View accessibilityRole="radiogroup" accessibilityLabel={`${item.name} status`} style={styles.statuses}>
        {STATUSES.map((status) => {
          const selected = item.status === status.value;
          return (
            <Pressable
              key={status.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => actions.setInventoryStatus(item.id, status.value)}
              style={[
                styles.status,
                selected && status.value === 'out' && styles.statusOut,
                selected && status.value === 'low' && styles.statusLow,
                selected && status.value === 'available' && styles.statusAvailable,
              ]}>
              <Text
                weight={selected ? 'bold' : 'semibold'}
                size={13}
                color={
                  !selected
                    ? Palette.slate
                    : status.value === 'out'
                      ? Palette.dangerDeep
                      : status.value === 'low'
                        ? Palette.slateDeep
                        : Palette.ink
                }>
                {status.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function StatusTag({ status }: { status: StockStatus }) {
  if (status === 'out') return <Tag label="Out" background={Palette.coralTint} color={Palette.dangerDeep} />;
  if (status === 'low') return <Tag label="Low" background={Palette.slateTint} color={Palette.slateDeep} />;
  return <Tag label="Available" />;
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
  title: {
    letterSpacing: -0.5,
  },
  add: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Palette.coral,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filters: {
    gap: 8,
  },
  stockCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  stockTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  onList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addToList: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Palette.coral,
    justifyContent: 'center',
  },
  statuses: {
    flexDirection: 'row',
    gap: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  status: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOut: {
    borderWidth: 1.5,
    borderColor: Palette.danger,
    backgroundColor: Palette.coralTint,
  },
  statusLow: {
    borderWidth: 1.5,
    borderColor: Palette.slate,
    backgroundColor: Palette.slateTint,
  },
  statusAvailable: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
    backgroundColor: Palette.divider,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
});
