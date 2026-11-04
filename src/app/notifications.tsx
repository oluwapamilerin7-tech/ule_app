import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SegmentsText } from '@/components/segments-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { BackButton, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { canRespondToEvents, myInvite } from '@/state/permissions';
import { currentUser, openOverdue, openToday, stockCounts } from '@/state/selectors';
import type { AppNotification } from '@/state/types';

export default function NotificationsScreen() {
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  // The daily-summary card is for the adults who run the house.
  const adult = me?.role === 'admin' || me?.role === 'member';
  const unread = state.notifications.filter((n) => n.unread);
  const earlier = state.notifications.filter((n) => !n.unread);
  const overdue = openOverdue(state.tasks).length;
  const today = openToday(state.tasks).length;
  const stock = stockCounts(state);
  const firstEvent = state.events.find((e) => e.dayOffset === 0 && !e.allDay);

  const summary = [
    `${today} ${today === 1 ? 'thing' : 'things'} today`,
    overdue ? `${overdue} overdue` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton fallback="/home" />
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={26}>
            Notifications
          </Text>
          {me && !adult ? (
            <Text size={13} muted>
              {me.name}&apos;s view
            </Text>
          ) : null}
        </View>
        <IconButton icon="sun" label="Notification settings" onPress={() => router.push('/reminders')} />
      </View>

      {adult ? (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate('/home')}
        style={({ pressed }) => [styles.summary, pressed && { opacity: 0.9 }]}>
        <View style={styles.summaryTop}>
          <Text weight="semibold" size={12} color={Palette.line}>
            DAILY SUMMARY
          </Text>
          <Text weight="semibold" size={12} color={Palette.line}>
            {state.preferences.dailySummaryAt}
          </Text>
        </View>
        <Text display size={20} color={Palette.white} style={styles.summaryTitle}>
          {summary}.{firstEvent ? ` ${firstEvent.title.split(' — ')[0]} at ${firstEvent.start}.` : ''}
        </Text>
        <View style={styles.pills}>
          {overdue ? (
            <View style={[styles.pill, { backgroundColor: Palette.coral }]}>
              <Text weight="bold" size={12}>
                {overdue} overdue
              </Text>
            </View>
          ) : null}
          {stock.low + stock.out ? (
            <View style={[styles.pill, { backgroundColor: Palette.surface }]}>
              <Text weight="bold" size={12}>
                {stock.low + stock.out} running low
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      ) : null}

      {unread.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel title="New" />
          <Card divided>
            {unread.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </Card>
        </View>
      ) : null}

      {earlier.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel title="Earlier" />
          <Card divided>
            {earlier.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </Card>
        </View>
      ) : null}

      {state.notifications.length === 0 ? (
        <Card padded>
          <Text size={14} muted>
            {"You're all caught up."}
          </Text>
        </Card>
      ) : null}

      {unread.length > 0 ? (
        <Button
          label="Mark all as read"
          variant="ghost"
          size="sm"
          onPress={actions.markAllNotificationsRead}
          style={styles.markRead}
        />
      ) : null}
    </Screen>
  );
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  // "Ayo invited you to Inter-house sports" — answer right here while it's still open.
  const eventId = notification.kind === 'event_invite' ? notification.action?.href.split('/event/')[1] : undefined;
  const event = eventId ? state.events.find((e) => e.id === eventId) : undefined;
  const reply = me && event ? myInvite(me, event)?.response : undefined;
  const answerable = !!me && !!event && canRespondToEvents(me) && reply !== undefined;

  return (
    <View style={styles.row}>
      {notification.unread ? <View style={styles.unreadDot} /> : null}
      <View style={[styles.flex, styles.rowBody]}>
        <SegmentsText segments={notification.body} muted={!notification.unread} />
        {answerable && event ? (
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => actions.respondToEvent(event.id, 'accepted')}
              style={[styles.action, reply !== 'accepted' && reply !== 'invited' && styles.actionIdle]}>
              <Text weight="bold" size={13}>
                {reply === 'accepted' ? 'Accepted' : 'Accept'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => actions.respondToEvent(event.id, 'declined')}
              style={[styles.action, reply !== 'declined' && styles.actionIdle]}>
              <Text weight="bold" size={13}>
                {reply === 'declined' ? 'Declined' : 'Decline'}
              </Text>
            </Pressable>
          </View>
        ) : notification.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(notification.action!.href as Href)}
            style={styles.action}>
            <Text weight="bold" size={13}>
              {notification.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text size={12} muted>
        {notification.when}
      </Text>
    </View>
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
  summary: {
    backgroundColor: Palette.ink,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    lineHeight: 25,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.coral,
    marginTop: 7,
  },
  rowBody: {
    gap: 6,
  },
  action: {
    alignSelf: 'flex-start',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Palette.coral,
    justifyContent: 'center',
  },
  actionIdle: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  markRead: {
    alignSelf: 'center',
  },
});
