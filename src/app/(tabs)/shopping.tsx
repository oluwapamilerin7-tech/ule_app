import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { Avatar, Checkbox } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { FontFamily, Palette, TabBarSpace } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { formatNaira } from '@/lib/money';
import { useHousehold } from '@/state/household';
import {
  canAddToShoppingList,
  canAssignShopper,
  canEditItem,
  canFinishShopping,
  canSeeShoppingTotals,
  canSendRequests,
  canTickItems,
  canViewShoppingList,
  isShopper,
} from '@/state/permissions';
import { currentUser, lineTotal, memberById, quantityLabel, shoppingTotals } from '@/state/selectors';
import type { HouseholdState, Member, ShoppingItem, Store } from '@/state/types';

const STORES: Store[] = ['Market', 'Supermarket', 'Other'];

/** "Garri, 1 paint" → { name: "Garri", qty: 1, unit: "paint" } */
function parseQuickAdd(text: string) {
  const [name, ...rest] = text.split(',');
  const match = /^\s*(\d+)\s*(.*)$/.exec(rest.join(','));
  return {
    name: name.trim(),
    qty: match ? Math.max(1, Number(match[1])) : 1,
    unit: match?.[2].trim() || 'pack',
  };
}

function itemDetail(state: HouseholdState, me: Member, item: ShoppingItem, grouped: boolean) {
  if (item.inBasket) {
    const by = memberById(state, item.addedBy)?.name;
    return `In basket · ${item.pendingSync ? 'waiting to sync' : (by ?? 'ticked')}`;
  }
  const amount =
    item.unitPrice != null && item.qty > 1 ? `${quantityLabel(item)} × ${formatNaira(item.unitPrice)}` : quantityLabel(item);
  const source = item.fromLowStock
    ? 'from low stock'
    : grouped
      ? null
      : item.addedBy === me.id
        ? 'added by you'
        : memberById(state, item.addedBy)?.name;
  return [amount, source].filter(Boolean).join(' · ');
}

export default function ShoppingScreen() {
  const { state, actions } = useHousehold();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const keyboardHeight = useKeyboardHeight();
  const me = currentUser(state);
  if (!me) return null;
  // Only Admins and today's shopper see the household list; everyone else sends lists (E09).
  if (!canViewShoppingList(state, me)) return <Redirect href="/requests" />;

  const admin = canAddToShoppingList(me);
  const showTotals = canSeeShoppingTotals(me);
  const ticking = canTickItems(state, me);
  // The shopper finishes their trip; an Admin can also finish on someone's behalf.
  const finishing = canFinishShopping(state, me) && state.shopping.length > 0;
  const shopping = isShopper(state, me);
  const requests = canSendRequests(me) && !admin;
  const totals = shoppingTotals(state);
  const shopper = memberById(state, state.shopper.memberId);
  const pending = state.sync.pending.length;
  const progress = totals.total > 0 ? totals.inBasket / totals.total : 0;
  const myWaiting = state.requests.filter((r) => r.requesterId === me.id && r.status === 'pending').length;
  // Sits just above the pill nav, or just above the keyboard while typing.
  const quickAddBottom = keyboardHeight > 0 ? keyboardHeight + 8 : Math.max(insets.bottom, 12) + 10 + 56 + 14;

  const submitQuickAdd = () => {
    const parsed = parseQuickAdd(draft);
    if (!parsed.name) return;
    if (admin) void actions.saveShoppingItem({ ...parsed, store: 'market' });
    else router.push({ pathname: '/request-items', params: { name: parsed.name } });
    setDraft('');
  };

  const banner = !state.sync.online ? (
    <View style={styles.offline}>
      <Icon name="wifi-off" size={16} color={Palette.white} />
      <Text size={12} color={Palette.white} style={styles.flex}>
        <Text weight="bold" size={12} color={Palette.white}>
          {"You're offline."}
        </Text>{' '}
        Changes are saved and will sync.
      </Text>
    </View>
  ) : null;

  const quickAdd =
    admin || requests ? (
      <View style={[styles.quickAdd, { bottom: quickAddBottom }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submitQuickAdd}
          returnKeyType="done"
          placeholder={admin ? 'Add an item… e.g. Garri, 1 paint' : 'Request an item… e.g. Garri, 1 paint'}
          placeholderTextColor={Palette.grey}
          accessibilityLabel={admin ? 'Add an item' : 'Request an item'}
          style={styles.quickInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={admin ? 'Add item with amount' : 'Request items'}
          onPress={() => {
            const name = draft.trim() ? parseQuickAdd(draft).name : undefined;
            if (admin) router.push({ pathname: '/add-item', params: name ? { name } : {} });
            else router.push({ pathname: '/request-items', params: name ? { name } : {} });
          }}
          style={styles.quickButton}>
          <Icon name="plus" size={22} color={Palette.white} />
        </Pressable>
      </View>
    ) : undefined;

  // Approved requests get their own section ("Ayo's list · Approved by Deborah · 10:05am").
  const groups = state.shoppingGroups.filter((g) => state.shopping.some((i) => i.requestId === g.id));
  const ungrouped = state.shopping.filter((i) => !i.requestId || !groups.some((g) => g.id === i.requestId));

  const renderItem = (item: ShoppingItem, grouped: boolean) => {
    const editable = canEditItem(me, item);
    const priceLabel = item.priceHidden ? null : item.unitPrice != null ? formatNaira(lineTotal(item)) : null;
    const partBuying = ticking && !item.inBasket && item.qty > 1 && Number.isInteger(item.qty);
    const alsoIn = grouped
      ? state.shopping.find(
          (other) => other.id !== item.id && !other.requestId && other.name.toLowerCase() === item.name.toLowerCase(),
        )
      : undefined;
    return (
      <View key={item.id} style={styles.item}>
        <Checkbox
          checked={item.inBasket}
          onChange={ticking ? () => actions.toggleShoppingItem(item.id) : undefined}
          label={`${item.name} in basket`}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!editable}
          onPress={() => router.push({ pathname: '/add-item', params: { id: item.id } })}
          style={styles.flex}>
          <Text weight="semibold" color={item.inBasket ? Palette.slate : Palette.ink} style={item.inBasket && styles.struck}>
            {item.name}
          </Text>
          {partBuying ? (
            <View style={styles.partRow}>
              <Text size={12} muted>
                {quantityLabel(item)} · bought
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Less ${item.name} bought`}
                disabled={item.boughtQty <= 0}
                onPress={() => actions.setBoughtQty(item.id, item.boughtQty - 1)}
                hitSlop={6}
                style={styles.partButton}>
                <Text weight="bold" size={14} color={item.boughtQty <= 0 ? Palette.grey : Palette.ink}>
                  −
                </Text>
              </Pressable>
              <Text weight="bold" size={12}>
                {item.boughtQty}/{item.qty}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`More ${item.name} bought`}
                onPress={() => actions.setBoughtQty(item.id, item.boughtQty + 1)}
                hitSlop={6}
                style={styles.partButton}>
                <Text weight="bold" size={14}>
                  +
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text size={12} muted>
              {itemDetail(state, me, item, grouped)}
              {alsoIn ? ` · also in ${alsoIn.store}` : ''}
            </Text>
          )}
        </Pressable>
        {priceLabel ? (
          <Text weight="bold" color={item.inBasket ? Palette.slate : Palette.ink}>
            {priceLabel}
          </Text>
        ) : admin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add an amount for ${item.name}`}
            onPress={() => router.push({ pathname: '/add-item', params: { id: item.id } })}
            style={styles.addAmount}>
            <Text weight="bold" size={12}>
              + ₦ Amount
            </Text>
          </Pressable>
        ) : !item.priceHidden ? (
          <Text size={12} muted>
            No price yet
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <Screen
      tabBar
      gap={12}
      banner={banner}
      overlay={quickAdd}
      contentStyle={{ paddingTop: 16, paddingBottom: TabBarSpace + 76 + insets.bottom }}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={28} style={styles.title}>
            {me.role === 'staff' ? 'Shopping list' : 'Shopping'}
          </Text>
          {!admin && ticking ? (
            <Text size={13} muted>
              Tick items as you buy them
            </Text>
          ) : null}
        </View>
        {admin ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/shopping-history')}
            style={styles.waiting}>
            <Icon name="clock" size={15} />
            <Text weight="semibold" size={13}>
              History
            </Text>
          </Pressable>
        ) : null}
        {pending > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/sync')} style={styles.waiting}>
            <Icon name="sync" size={15} />
            <Text weight="semibold" size={13}>
              {pending} waiting
            </Text>
          </Pressable>
        ) : null}
      </View>

      {requests ? (
        <Pressable accessibilityRole="link" onPress={() => router.push('/requests')} style={styles.requestsLink}>
          <Icon name="send" size={15} />
          <Text weight="semibold" size={13} style={styles.flex}>
            My requests{myWaiting ? ` · ${myWaiting} waiting` : ''}
          </Text>
          <Icon name="chevron-right" size={16} color={Palette.slate} />
        </Pressable>
      ) : null}

      {showTotals ? (
        <View style={styles.total} accessibilityLabel="List total">
          <View style={styles.totalTop}>
            <View style={styles.totalAmount}>
              <Text weight="semibold" size={12} color={Palette.line}>
                Estimated total · {totals.count} items
              </Text>
              <Text display size={32} color={Palette.white} style={styles.totalValue}>
                {formatNaira(totals.total)}
              </Text>
            </View>
            <View style={styles.budget}>
              <Text weight="semibold" size={12} color={Palette.white}>
                Budget {formatNaira(state.household.budget)}
              </Text>
              <Text weight="semibold" size={12} color={totals.budgetLeft >= 0 ? Palette.coral : Palette.coralLine}>
                {totals.budgetLeft >= 0 ? `${formatNaira(totals.budgetLeft)} left` : `${formatNaira(-totals.budgetLeft)} over`}
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <View style={styles.totalBottom}>
            <Text size={12} color={Palette.line}>
              In basket{' '}
              <Text weight="bold" size={12} color={Palette.white}>
                {formatNaira(totals.inBasket)}
              </Text>
            </Text>
            <Text size={12} color={Palette.line}>
              Left to buy{' '}
              <Text weight="bold" size={12} color={Palette.white}>
                {formatNaira(totals.leftToBuy)}
              </Text>
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.shopper}>
        {shopper ? <Avatar person={shopper} size={30} /> : null}
        <Text size={13} style={styles.flex}>
          {shopper?.id === me.id ? (
            <>
              <Text weight="bold" size={13}>
                {"You're"}
              </Text>{' '}
              {me.role === 'staff' ? 'the shopper' : 'shopping'} {state.shopper.when.toLowerCase()} · {totals.basketCount} of{' '}
              {totals.count} in basket
            </>
          ) : (
            <>
              <Text weight="bold" size={13}>
                {shopper?.name ?? 'Nobody'}
              </Text>{' '}
              is shopping {state.shopper.when.toLowerCase()} · {totals.basketCount} of {totals.count} in basket
            </>
          )}
        </Text>
        {canAssignShopper(me) ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/shopper')} style={styles.change}>
            <Text weight="semibold" size={12}>
              Change
            </Text>
          </Pressable>
        ) : null}
      </View>

      {state.shopping.length === 0 ? (
        <Card padded>
          <Text size={14} muted>
            {admin ? 'The list is empty. Add what the house needs below.' : 'The list is empty.'}
          </Text>
        </Card>
      ) : null}

      {STORES.map((store) => {
        const items = ungrouped.filter((item) => item.store === store);
        if (items.length === 0) return null;
        const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
        return (
          <View key={store} style={styles.section}>
            <SectionLabel
              title={store}
              size={12}
              right={
                showTotals ? (
                  <Text weight="bold" size={12} muted>
                    {formatNaira(subtotal)}
                  </Text>
                ) : null
              }
            />
            <Card divided>{items.map((item) => renderItem(item, false))}</Card>
          </View>
        );
      })}

      {groups.map((group) => {
        const requester = memberById(state, group.requesterId);
        const reviewer = memberById(state, group.reviewedById);
        const items = state.shopping.filter((i) => i.requestId === group.id);
        return (
          <View key={group.id} style={styles.section}>
            <SectionLabel
              title={`${requester?.id === me.id ? 'Your' : `${requester?.name ?? 'Someone'}'s`} list`}
              size={12}
              right={
                <Text weight="semibold" size={12} muted>
                  Approved{reviewer ? ` by ${reviewer.name}` : ''}
                  {group.reviewedAt ? ` · ${group.reviewedAt}` : ''}
                </Text>
              }
            />
            <Card divided>{items.map((item) => renderItem(item, true))}</Card>
          </View>
        );
      })}

      {finishing ? (
        <Button
          label="Done shopping"
          icon="check"
          variant={shopping ? 'primary' : 'outline'}
          onPress={() => router.push('/done-shopping')}
        />
      ) : null}

      {requests ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/request-items')}
          style={({ pressed }) => [styles.createList, pressed && { opacity: 0.8 }]}>
          <Icon name="plus" size={18} />
          <View style={styles.flex}>
            <Text weight="semibold">Create shopping list</Text>
            <Text size={12} muted>
              {state.members
                .filter((m) => m.role === 'admin')
                .map((m) => m.name)
                .join(' or ')}{' '}
              approve it before it&apos;s added
            </Text>
          </View>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.ink,
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    letterSpacing: -0.5,
  },
  waiting: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Palette.muted,
  },
  total: {
    backgroundColor: Palette.ink,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  totalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalAmount: {
    gap: 2,
  },
  totalValue: {
    letterSpacing: -0.5,
  },
  budget: {
    alignItems: 'flex-end',
    gap: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A4A4A',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.coral,
  },
  totalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shopper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 14,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 10,
  },
  change: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    justifyContent: 'center',
  },
  section: {
    gap: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAmount: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.grey,
    justifyContent: 'center',
  },
  createList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.grey,
  },
  quickAdd: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  quickInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 23,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Palette.ink,
    backgroundColor: Palette.surface,
  },
  quickButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
