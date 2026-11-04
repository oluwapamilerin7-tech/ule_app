import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { formatClock, formatShortDate } from '@/lib/dates';
import { useHousehold } from '@/state/household';
import { canRespondToEvents, myInvite } from '@/state/permissions';
import { currentUser, memberById } from '@/state/selectors';
import type { CalendarEvent, HouseholdState, Member } from '@/state/types';

/** Everyone who sees an event: its creator, then the people invited (whatever they replied). */
export function eventViewers(state: HouseholdState, event: CalendarEvent): Member[] {
  if (event.kind === 'holiday') return state.members;
  const ids = [event.createdBy, ...event.invitees.map((i) => i.memberId)];
  return [...new Set(ids)].map((id) => memberById(state, id)).filter((m): m is Member => !!m);
}

/** Overlapping avatars of who can see an event ("Ay D T E", "D T +3"). */
export function ViewerAvatars({ event, max = 4, size = 22 }: { event: CalendarEvent; max?: number; size?: number }) {
  const { state } = useHousehold();
  const viewers = eventViewers(state, event);
  const shown = viewers.slice(0, max);
  const extra = viewers.length - shown.length;
  return (
    <View
      accessible
      accessibilityLabel={`Visible to ${viewers.map((v) => v.name).join(', ')}`}
      style={styles.stack}>
      {shown.map((person, index) => (
        <Avatar key={person.id} person={person} size={size} style={[styles.stacked, index > 0 && { marginLeft: -6 }]} />
      ))}
      {extra > 0 ? (
        <View style={[styles.more, { height: size, minWidth: size, borderRadius: size / 2, marginLeft: -6 }]}>
          <Text weight="bold" size={10}>
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** "Sat 3 Oct, 11:00am · Ikeja" */
export function eventWhen(event: CalendarEvent) {
  const start = new Date(event.startsAt);
  const day = formatShortDate(start);
  return [event.allDay ? `${day} · All day` : `${day}, ${formatClock(start)}`, event.place].filter(Boolean).join(' · ');
}

/** "Tunde invited you to Car service" with Accept / Decline (stays on the calendar either way). */
export function InvitationCard({ event }: { event: CalendarEvent }) {
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const inviter = memberById(state, event.createdBy);
  if (!me) return null;
  const reply = myInvite(me, event)?.response;
  const canReply = canRespondToEvents(me);
  return (
    <Card padded style={styles.card}>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/event/${event.id}`)} style={styles.top}>
        {inviter ? <Avatar person={inviter} size={32} /> : null}
        <View style={styles.flex}>
          <Text size={14}>
            <Text weight="bold" size={14}>
              {inviter?.name ?? 'Someone'}
            </Text>{' '}
            invited you to{' '}
            <Text weight="bold" size={14}>
              {event.title}
            </Text>
          </Text>
          <Text size={12} muted>
            {eventWhen(event)}
          </Text>
        </View>
      </Pressable>
      {canReply ? (
        <View style={styles.actions}>
          <Button
            label={reply === 'accepted' ? 'Accepted' : 'Accept'}
            icon={reply === 'accepted' ? 'check' : undefined}
            variant={reply === 'accepted' ? 'dark' : 'outline'}
            size="sm"
            onPress={() => actions.respondToEvent(event.id, 'accepted')}
            style={styles.flex}
          />
          <Button
            label={reply === 'declined' ? 'Declined' : 'Decline'}
            variant={reply === 'declined' ? 'dark' : 'subtle'}
            size="sm"
            onPress={() => actions.respondToEvent(event.id, 'declined')}
            style={styles.flex}
          />
        </View>
      ) : (
        <Text size={12} muted>
          View only · you get reminders
        </Text>
      )}
    </Card>
  );
}

/** Events I've been invited to and haven't answered yet, soonest first. */
export function pendingInvitations(state: HouseholdState) {
  const me = currentUser(state);
  if (!me || !canRespondToEvents(me)) return [];
  const seen = new Set<string>();
  return state.events
    .filter((e) => e.dayOffset >= 0 && myInvite(me, e)?.response === 'invited')
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stacked: {
    borderWidth: 1.5,
    borderColor: Palette.surface,
  },
  more: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: Palette.muted,
    borderWidth: 1.5,
    borderColor: Palette.surface,
  },
  card: {
    gap: 12,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
