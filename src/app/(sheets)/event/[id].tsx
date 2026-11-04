import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button, IconButton } from '@/components/ui/button';
import { Card, InfoNote, SectionLabel, Tag } from '@/components/ui/card';
import { Avatar } from '@/components/ui/controls';
import { Icon, type IconName } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { addDays, formatShortDate } from '@/lib/dates';
import { useHousehold } from '@/state/household';
import { canEditEvent, canRespondToEvents, myInvite } from '@/state/permissions';
import { currentUser, memberById } from '@/state/selectors';

/** M08 — event detail sheet. */
export default function EventDetailSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  // Recurring events appear once per date; show the next upcoming one.
  const occurrences = state.events.filter((e) => e.id === id);
  const event = occurrences.find((e) => e.dayOffset >= 0) ?? occurrences.at(-1);
  const me = currentUser(state);
  if (!event || !me) return <NotFoundSheet what="Event" />;

  const date = addDays(new Date(), event.dayOffset);
  const creator = memberById(state, event.createdBy);
  const mine = event.createdBy === me.id;
  const editable = event.kind !== 'holiday' && canEditEvent(me, event);
  const invite = myInvite(me, event);
  const RESPONSE = { invited: 'No reply yet', accepted: 'Accepted', declined: 'Declined' } as const;
  const confirmDelete = () =>
    Alert.alert(`Delete '${event.title}'?`, 'It will disappear from everyone’s calendar.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          actions.deleteEvent(event.id);
          router.back();
        },
      },
    ]);
  const when = event.allDay
    ? `${formatShortDate(date)} · All day`
    : `${formatShortDate(date)} · ${[event.start, event.end].filter(Boolean).join(' – ')}`;

  return (
    <Sheet>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Tag
            label={
              mine
                ? 'YOU CREATED THIS'
                : invite && creator
                  ? `INVITED BY ${creator.name.toUpperCase()}`
                  : `${event.kind === 'holiday' ? 'HOLIDAY' : 'EVENT'}${event.category ? ` · ${event.category}` : ''}`
            }
            background={Palette.slateTint}
            color={Palette.slateDeep}
            size={11}
          />
          <Text accessibilityRole="header" display size={24} style={styles.title}>
            {event.title}
          </Text>
        </View>
        <IconButton icon="close" label="Close" variant="soft" onPress={() => router.back()} />
      </View>

      {invite?.response === 'declined' ? (
        <InfoNote icon="close">
          <Text weight="bold" size={14}>
            You declined the invite
          </Text>
          <Text size={13} muted>
            It stays on your calendar.
          </Text>
        </InfoNote>
      ) : null}

      <View style={styles.facts}>
        <Fact icon="calendar" text={when} />
        {event.place ? <Fact icon="pin" text={event.place} /> : null}
        {event.repeat ? <Fact icon="repeat" text={event.repeat} /> : null}
        {event.reminders.length ? <Fact icon="bell" text={event.reminders.join(' · ')} /> : null}
      </View>

      {event.notes ? (
        <View style={styles.notes}>
          <Text weight="bold" size={12} muted>
            Note
          </Text>
          <Text size={14} style={styles.notesText}>
            {event.notes}
          </Text>
        </View>
      ) : null}

      {event.kind !== 'holiday' ? (
        <View style={styles.section}>
          <SectionLabel title="Invited" />
          <Card divided>
            {creator ? (
              <View style={styles.person}>
                <Avatar person={creator} size={30} />
                <Text weight="semibold" style={styles.flex}>
                  {creator.id === me.id ? `${creator.name} (you)` : creator.name}
                </Text>
                <Text size={13} muted>
                  Organiser
                </Text>
              </View>
            ) : null}
            {event.invitees.map((invitee) => {
              const member = memberById(state, invitee.memberId);
              if (!member) return null;
              const viewOnly = member.role === 'staff';
              return (
                <View key={member.id} style={styles.person}>
                  <Avatar person={member} size={30} />
                  <Text weight="semibold" style={styles.flex}>
                    {member.id === me.id ? `${member.name} (you)` : member.name}
                  </Text>
                  <Text
                    weight="semibold"
                    size={13}
                    color={invitee.response === 'accepted' ? Palette.slateDeep : Palette.slate}>
                    {viewOnly ? 'View only' : RESPONSE[invitee.response]}
                  </Text>
                </View>
              );
            })}
          </Card>
          <Text size={12} muted>
            {mine
              ? 'Only you and the people you invited can see this event.'
              : 'Only the people invited can see this event.'}
          </Text>
        </View>
      ) : null}

      {invite && canRespondToEvents(me) ? (
        <View style={styles.actions}>
          <Button
            label={invite.response === 'accepted' ? 'Accepted' : 'Accept'}
            icon={invite.response === 'accepted' ? 'check' : undefined}
            variant={invite.response === 'accepted' ? 'dark' : 'outline'}
            size="md"
            onPress={() => actions.respondToEvent(event.id, 'accepted')}
            style={styles.flex}
          />
          <Button
            label={invite.response === 'declined' ? 'Declined' : 'Decline'}
            variant={invite.response === 'declined' ? 'dark' : 'subtle'}
            size="md"
            onPress={() => actions.respondToEvent(event.id, 'declined')}
            style={styles.flex}
          />
        </View>
      ) : null}

      {editable ? (
        <View style={styles.actions}>
          <Button
            label="Edit"
            variant="outline"
            size="md"
            onPress={() => router.replace({ pathname: '/new-event', params: { id: event.id } })}
            style={styles.flex}
          />
          <Button label="Delete" variant="danger-outline" size="md" onPress={confirmDelete} style={styles.flex} />
        </View>
      ) : null}
    </Sheet>
  );
}

function Fact({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={20} color={Palette.slate} />
      <Text style={styles.flex}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 6,
  },
  title: {
    lineHeight: 28,
  },
  facts: {
    gap: 12,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  section: {
    gap: 8,
  },
  people: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  notes: {
    backgroundColor: Palette.muted,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  notesText: {
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
});
