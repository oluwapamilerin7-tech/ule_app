import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, SectionLabel, Tag } from '@/components/ui/card';
import { Avatar } from '@/components/ui/controls';
import { BackButton, PageTitle, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { canReviewRequests, canSendRequests } from '@/state/permissions';
import { requestSummary, STATUS_TEXT } from '@/lib/requests';
import { currentUser, memberById } from '@/state/selectors';
import type { ShoppingRequest } from '@/state/types';

/**
 * E10 / C02 — "My requests": the lists you've sent and where they stand. Admins see every
 * request in the household here, newest first.
 */
export default function RequestsScreen() {
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const admins = state.members.filter((m) => m.role === 'admin').map((m) => m.name);

  useEffect(() => {
    void actions.refresh();
  }, [actions]);

  if (!me) return null;
  const reviewer = canReviewRequests(me);
  const requests = reviewer ? state.requests : state.requests.filter((r) => r.requesterId === me.id);
  const pending = requests.filter((r) => r.status === 'pending');
  const earlier = requests.filter((r) => r.status !== 'pending');

  const row = (request: ShoppingRequest) => {
    const who = memberById(state, request.requesterId);
    return (
      <Pressable
        key={request.id}
        accessibilityRole="button"
        onPress={() => router.push(`/requests/${request.id}`)}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: Palette.muted }]}>
        {reviewer && who ? <Avatar person={who} size={32} /> : null}
        <View style={styles.flex}>
          <Text weight="semibold">{reviewer ? `${request.requesterName}'s list` : requestSummary(request)}</Text>
          <Text size={12} muted>
            {reviewer ? `${requestSummary(request)} · ` : ''}
            {request.sentLabel.replace(/^today/, 'Today')}
          </Text>
          <Text size={13} color={request.status === 'pending' ? Palette.ink : Palette.slate}>
            {request.status === 'pending' && !reviewer
              ? `${STATUS_TEXT.pending}. Sent to ${admins.join(' and ')}.`
              : STATUS_TEXT[request.status]}
          </Text>
        </View>
        {request.status === 'pending' && reviewer ? (
          <Tag label="Review" background={Palette.coralTint} color={Palette.dangerDeep} size={12} />
        ) : null}
        {request.status === 'pending' && !reviewer ? (
          <Button
            label="Withdraw"
            variant="subtle"
            size="sm"
            onPress={() => actions.withdrawRequest(request.id)}
            style={styles.withdraw}
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Screen gap={18}>
      <View style={styles.header}>
        <BackButton fallback="/home" />
        <View style={styles.flex} />
        {canSendRequests(me) ? (
          <Pressable accessibilityRole="link" onPress={() => router.push('/request-items')} hitSlop={8}>
            <Text weight="bold" size={14}>
              + New list
            </Text>
          </Pressable>
        ) : null}
      </View>
      <PageTitle title={reviewer ? 'Shopping requests' : 'My requests'} />

      {requests.length === 0 ? (
        <Card padded>
          <Text size={14} muted>
            {reviewer ? 'No one has sent a shopping list yet.' : "You haven't sent any shopping lists yet."}
          </Text>
        </Card>
      ) : null}

      {pending.length ? (
        <View style={styles.section}>
          <SectionLabel title={reviewer ? 'Waiting for review' : 'Waiting'} />
          <Card divided>{pending.map(row)}</Card>
        </View>
      ) : null}

      {earlier.length ? (
        <View style={styles.section}>
          <SectionLabel title="Earlier" />
          <Card divided>{earlier.map(row)}</Card>
        </View>
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
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  withdraw: {
    paddingHorizontal: 12,
    height: 36,
  },
});
