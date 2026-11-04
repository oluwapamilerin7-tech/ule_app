import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button, IconButton } from '@/components/ui/button';
import { Card, InfoNote, SectionLabel, Tag } from '@/components/ui/card';
import { Avatar, Checkbox } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { BackButton, PageTitle, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { formatNaira } from '@/lib/money';
import { joinNames, requestItemLabel, STATUS_TEXT } from '@/lib/requests';
import { useHousehold } from '@/state/household';
import { canReviewRequests } from '@/state/permissions';
import { currentUser, memberById, ROLE_LABELS } from '@/state/selectors';
import type { ShoppingRequest } from '@/state/types';

type Outcome = { kind: 'approved'; added: string[]; skipped: string[] } | { kind: 'rejected' };

/**
 * One shopping request.
 * - Admins reviewing a pending list (C05 / D01): Add or Skip each line — lines already on the
 *   household list are flagged — then Approve all, Approve selected, or Reject.
 * - Everyone else (C02–C04): where their list stands, with Withdraw while it's waiting.
 */
export default function RequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const stored = state.requests.find((r) => r.id === id);
  const [request, setRequest] = useState<ShoppingRequest | undefined>(stored);
  const [loading, setLoading] = useState(!stored);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // Always fetch fresh: "Already on the list" depends on the list right now.
  useEffect(() => {
    let live = true;
    actions
      .loadRequest(id)
      .then((loaded) => {
        if (live) setRequest(loaded);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [actions, id]);

  const current = stored ?? request;
  if (!me) return null;
  if (!current) {
    return (
      <Screen>
        <BackButton fallback="/home" />
        {loading ? (
          <ActivityIndicator color={Palette.ink} />
        ) : (
          <Text muted>{"This request isn't available any more."}</Text>
        )}
      </Screen>
    );
  }

  const requester = memberById(state, current.requesterId);
  const first = current.requesterName;
  const otherAdmins = state.members.filter((m) => m.role === 'admin' && m.id !== me.id).map((m) => m.name);

  if (outcome) {
    return (
      <Screen gap={18}>
        <Text weight="semibold" size={13} muted>
          {first}&apos;s {requester?.role === 'child' ? 'shopping list' : 'request'}
        </Text>
        <View style={styles.doneIcon}>
          <Icon name={outcome.kind === 'approved' ? 'check' : 'close'} size={28} color={Palette.ink} />
        </View>
        {outcome.kind === 'approved' ? (
          <>
            <PageTitle
              title="Added to the household list"
              subtitle={[
                outcome.added.length
                  ? `${joinNames(outcome.added)} ${outcome.added.length === 1 ? 'was' : 'were'} added as separate lines${requester?.role === 'child' ? ` under "${first}'s list"` : ''}.`
                  : 'Nothing was added.',
                outcome.skipped.length ? `${joinNames(outcome.skipped)} ${outcome.skipped.length === 1 ? 'was' : 'were'} skipped.` : null,
                `${first} has been told.`,
              ]
                .filter(Boolean)
                .join(' ')}
            />
            <Button label="View shopping list" onPress={() => router.replace('/shopping')} />
          </>
        ) : (
          <PageTitle
            title="Request rejected"
            subtitle="Nothing was added to the household list. The person who sent it has been told."
          />
        )}
        <Button label="Back to Today" variant="outline" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  const reviewing = canReviewRequests(me) && current.status === 'pending';

  const review = async (skipIds: string[]) => {
    setBusy(true);
    try {
      await actions.approveRequest(current.id, skipIds);
      setOutcome({
        kind: 'approved',
        added: current.items.filter((i) => !skipIds.includes(i.id)).map((i) => i.name),
        skipped: current.items.filter((i) => skipIds.includes(i.id)).map((i) => i.name),
      });
    } catch (error) {
      reviewFailed(error);
    } finally {
      setBusy(false);
    }
  };

  const reviewFailed = (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) {
      Alert.alert('Already reviewed', 'Someone else has already reviewed this list.');
      void actions.loadRequest(current.id).then(setRequest).catch(() => {});
    } else {
      Alert.alert("Couldn't save that", error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const reject = () => {
    Alert.alert(
      `Reject ${first}'s ${requester?.role === 'child' ? 'list' : 'request'}?`,
      `Nothing will be added to the household list. ${first} will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await actions.rejectRequest(current.id);
              setOutcome({ kind: 'rejected' });
            } catch (error) {
              reviewFailed(error);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (reviewing) {
    const toAdd = current.items.length - skipped.size;
    return (
      <Screen gap={16}>
        <View style={styles.header}>
          <BackButton fallback="/home" />
          <View style={styles.flex} />
          {requester ? <Avatar person={requester} size={36} /> : null}
        </View>
        <PageTitle
          title={requester?.role === 'child' ? `${first}'s shopping list` : `${first}'s request`}
          subtitle={`${requester ? `${ROLE_LABELS[requester.role]} · ` : ''}${current.items.length} ${current.items.length === 1 ? 'item' : 'items'} · sent ${current.sentLabel}`}
        />
        <InfoNote icon="cart">
          <Text size={13} style={styles.note}>
            Approved items are added as separate lines
            {requester?.role === 'child' ? ` under "${first}'s list"` : ' on the household list'}.
            {otherAdmins.length
              ? ` ${otherAdmins.join(' and ')} can also review this — whoever acts first closes it for both of you.`
              : ''}
          </Text>
        </InfoNote>

        <Card divided>
          {current.items.map((item) => {
            const skip = skipped.has(item.id);
            const toggle = (add: boolean) =>
              setSkipped((now) => {
                const next = new Set(now);
                if (add) next.delete(item.id);
                else next.add(item.id);
                return next;
              });
            return (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemTop}>
                  <Checkbox checked={!skip} onChange={(add) => toggle(add)} label={`Add ${item.name}`} />
                  <View style={styles.flex}>
                    <Text weight="semibold" color={skip ? Palette.slate : Palette.ink} style={skip && styles.struck}>
                      {item.name}
                    </Text>
                    <Text size={12} muted>
                      {requestItemLabel(item)}
                      {item.unitPrice != null ? ` · ${formatNaira(item.unitPrice)}` : ''}
                    </Text>
                  </View>
                  {item.alreadyOnList ? (
                    <Tag label="Already on the list" background={Palette.coralTint} color={Palette.dangerDeep} size={11} />
                  ) : (
                    <IconButton
                      icon="edit"
                      label={`Edit ${item.name}`}
                      variant="soft"
                      size={34}
                      iconSize={15}
                      onPress={() =>
                        router.push({ pathname: '/review-item', params: { requestId: current.id, itemId: item.id } })
                      }
                    />
                  )}
                </View>
                {item.alreadyOnList ? (
                  <View style={styles.choice}>
                    <Button
                      label="Add as separate line"
                      variant={skip ? 'subtle' : 'dark'}
                      size="sm"
                      onPress={() => toggle(true)}
                      style={styles.flex}
                    />
                    <Button
                      label="Skip"
                      variant={skip ? 'dark' : 'subtle'}
                      size="sm"
                      onPress={() => toggle(false)}
                      style={styles.flex}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>

        <Text weight="bold" size={15} style={styles.center}>
          {toAdd} to add · {skipped.size} skipped
        </Text>

        <View style={styles.actions}>
          <Button label="Approve all" icon="check" disabled={busy} onPress={() => review([])} />
          <Button
            label="Approve selected"
            variant="outline"
            disabled={busy || toAdd === 0 || skipped.size === 0}
            onPress={() => review([...skipped])}
          />
          <Button label="Reject" variant="danger-outline" disabled={busy} onPress={reject} />
        </View>
      </Screen>
    );
  }

  // Status view for the person who sent it (and for Admins once it's closed).
  const mine = current.requesterId === me.id;
  const heading =
    current.status === 'pending'
      ? `Sent ${current.sentLabel}`
      : current.status === 'approved'
        ? `Approved ${current.reviewedLabel ?? ''}`
        : current.status === 'rejected'
          ? `Reviewed ${current.reviewedLabel ?? ''}`
          : `Sent ${current.sentLabel}`;
  const admins = state.members.filter((m) => m.role === 'admin').map((m) => m.name);
  const statusLine =
    current.status === 'pending'
      ? `Awaiting approval. Sent to ${admins.join(' and ')}.`
      : current.status === 'rejected'
        ? 'Not approved. Nothing was added to the household list.'
        : STATUS_TEXT[current.status];
  const listTitle =
    current.status === 'approved' ? 'Approved' : current.status === 'rejected' ? 'Not approved' : 'Sent';

  return (
    <Screen gap={16}>
      <BackButton fallback="/home" />
      <PageTitle
        title={mine ? 'My requests' : `${first}'s list`}
        subtitle={`${heading.charAt(0).toUpperCase()}${heading.slice(1)}${current.reviewedByName && !mine ? ` by ${current.reviewedByName}` : ''}`}
      />
      <InfoNote icon={current.status === 'approved' ? 'check' : current.status === 'pending' ? 'clock' : 'alert'}>
        <Text size={14} weight="semibold">
          {statusLine}
        </Text>
      </InfoNote>

      <View style={styles.section}>
        <SectionLabel title={`${listTitle} · ${current.items.length} ${current.items.length === 1 ? 'item' : 'items'}`} />
        <Card divided>
          {current.items.map((item) => (
            <View key={item.id} style={styles.statusItem}>
              <View style={styles.flex}>
                <Text weight="semibold" color={item.added === false ? Palette.slate : Palette.ink}>
                  {item.name}
                </Text>
                <Text size={12} muted>
                  {requestItemLabel(item)}
                </Text>
              </View>
              {current.status === 'approved' && item.added === false ? (
                <Text size={12} muted>
                  Skipped
                </Text>
              ) : null}
            </View>
          ))}
        </Card>
      </View>

      {mine && current.status === 'pending' ? (
        <Button
          label="Withdraw request"
          variant="danger-outline"
          onPress={() => {
            void actions.withdrawRequest(current.id);
            router.back();
          }}
        />
      ) : null}
      {mine && current.status !== 'pending' ? (
        <Button label="Request more items" variant="outline" onPress={() => router.replace('/request-items')} />
      ) : null}
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
  },
  note: {
    lineHeight: 19,
  },
  section: {
    gap: 8,
  },
  item: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choice: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 34,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: 10,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  doneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.coral,
  },
});
