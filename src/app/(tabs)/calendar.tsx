import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { eventViewers, InvitationCard, pendingInvitations, ViewerAvatars } from '@/components/event-people';
import { IconButton } from '@/components/ui/button';
import { Card, InfoNote, SectionLabel, Tag } from '@/components/ui/card';
import { Fab } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import {
  addDays,
  dayDiff,
  formatMonthYear,
  formatShortDate,
  isSameDay,
  startOfWeek,
  weekdayShort,
} from '@/lib/dates';
import { useHousehold } from '@/state/household';
import { canCreateEvents, myInvite } from '@/state/permissions';
import { currentUser, memberById } from '@/state/selectors';
import type { CalendarEvent } from '@/state/types';

function byStart(a: CalendarEvent, b: CalendarEvent) {
  return a.dayOffset - b.dayOffset || Number(b.allDay) - Number(a.allDay);
}

/** Calendar (07 / E03 / C06): only events shared with you, with invitations to answer. */
export default function CalendarScreen() {
  const { state } = useHousehold();
  const me = currentUser(state);
  const today = new Date();
  const creates = !!me && canCreateEvents(me);
  const invitations = pendingInvitations(state);
  const creators = state.members
    .filter((m) => m.role === 'admin' || m.role === 'child')
    .map((m) => (m.role === 'admin' ? null : m.name))
    .filter(Boolean);
  const [selected, setSelected] = useState(today);
  const weekStart = startOfWeek(selected);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsOn = (day: Date) => {
    const offset = dayDiff(today, day);
    return state.events.filter((e) => e.dayOffset === offset).sort(byStart);
  };

  const selectedOffset = dayDiff(today, selected);
  const dayEvents = eventsOn(selected);
  const comingUp = state.events
    .filter((e) => e.dayOffset > selectedOffset && e.dayOffset <= selectedOffset + 14)
    .sort(byStart)
    .slice(0, 6);
  const isToday = isSameDay(selected, today);

  return (
    <Screen
      tabBar
      overlay={creates ? <Fab label="Add event" onPress={() => router.push('/new-event')} /> : undefined}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={28} style={styles.title}>
            Calendar
          </Text>
          <Text weight="medium" size={13} muted>
            {formatMonthYear(weekStart)} · {creates ? 'Events shared with you' : 'View only · events shared with you'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <IconButton icon="chevron-left" label="Previous week" onPress={() => setSelected(addDays(selected, -7))} />
          <IconButton icon="chevron-right" label="Next week" onPress={() => setSelected(addDays(selected, 7))} />
        </View>
      </View>

      <View style={styles.week}>
        {week.map((day) => {
          const active = isSameDay(day, selected);
          const events = eventsOn(day);
          const dot = events[0]?.accent;
          return (
            <Pressable
              key={day.toISOString()}
              accessibilityRole="button"
              accessibilityLabel={`${formatShortDate(day)}, ${events.length} events`}
              accessibilityState={{ selected: active }}
              onPress={() => setSelected(day)}
              style={[
                styles.day,
                active && { backgroundColor: Palette.coral },
                !active && isSameDay(day, today) && styles.today,
              ]}>
              <Text weight="semibold" size={11} color={active ? Palette.ink : Palette.slate}>
                {weekdayShort(day).toUpperCase()}
              </Text>
              <Text weight="bold" size={17}>
                {day.getDate()}
              </Text>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: dot ? (active ? Palette.white : dot) : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {invitations.length ? (
        <View style={styles.section}>
          <SectionLabel
            title="Invitations"
            right={
              <Text weight="semibold" size={12} muted>
                Stays on your calendar either way
              </Text>
            }
          />
          {invitations.map((event) => (
            <InvitationCard key={event.id} event={event} />
          ))}
        </View>
      ) : null}

      {me?.role === 'member' ? (
        <InfoNote icon="lock" tone="plain">
          <Text size={13} muted>
            You can view the calendar and reply to invitations. Only Admins
            {creators.length ? ` and ${creators.join(', ')}` : ''} can create events.
          </Text>
        </InfoNote>
      ) : null}
      {me?.role === 'staff' ? (
        <InfoNote icon="lock" tone="plain">
          <Text size={13} muted>
            View only · you get reminders for events shared with you.
          </Text>
        </InfoNote>
      ) : null}

      <View style={styles.section}>
        <SectionLabel title={`${isToday ? 'Today · ' : ''}${formatShortDate(selected).replace(/ \w+$/, '')}`} />
        {dayEvents.length === 0 ? (
          <Card padded>
            <Text size={14} muted>
              {creates ? 'Nothing planned. Tap + to add an event.' : 'Nothing planned.'}
            </Text>
          </Card>
        ) : (
          dayEvents.map((event) => <EventCard key={event.key} event={event} />)
        )}
      </View>

      {comingUp.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel title="Coming up" />
          <Card divided>
            {comingUp.map((event) => {
              const date = addDays(today, event.dayOffset);
              const by = memberById(state, event.createdBy);
              const reply = me ? myInvite(me, event)?.response : undefined;
              const who =
                event.createdBy === me?.id
                  ? 'you created this'
                  : by
                    ? `invited by ${by.name}${reply === 'invited' && me?.role !== 'staff' ? ' · awaiting your reply' : reply === 'accepted' ? ' · you accepted' : reply === 'declined' ? ' · you declined' : ''}`
                    : null;
              return (
                <Pressable
                  key={event.key}
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/${event.id}`)}
                  style={({ pressed }) => [styles.upcoming, pressed && { backgroundColor: Palette.muted }]}>
                  <View style={styles.dateColumn}>
                    <Text weight="bold" size={11} muted>
                      {weekdayShort(date).toUpperCase()}
                    </Text>
                    <Text weight="bold" size={17}>
                      {date.getDate()}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text weight="semibold">{event.title}</Text>
                    <Text size={12} muted>
                      {[
                        event.allDay ? (event.subtitle ?? 'All day') : event.start,
                        event.kind === 'holiday' ? null : who,
                        event.repeat,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {event.kind === 'holiday' ? <Tag label="HOLIDAY" size={11} /> : <ViewerAvatars event={event} max={4} size={22} />}
                </Pressable>
              );
            })}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const { state } = useHousehold();
  const people = eventViewers(state, event);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => [styles.eventCard, pressed && { opacity: 0.8 }]}>
      <View style={styles.timeColumn}>
        <Text weight="bold" size={13}>
          {event.allDay ? 'All day' : event.start}
        </Text>
        {event.end ? (
          <Text weight="medium" size={13} muted>
            {event.end}
          </Text>
        ) : null}
      </View>
      <View style={[styles.bar, { backgroundColor: event.accent }]} />
      <View style={[styles.flex, styles.eventBody]}>
        <Text weight="bold">{event.title}</Text>
        {event.subtitle || event.repeat ? (
          <View style={styles.meta}>
            {event.subtitle ? (
              <Text size={12} muted>
                {event.subtitle}
              </Text>
            ) : null}
            {event.repeat ? (
              <>
                {event.subtitle ? (
                  <Text size={12} muted>
                    ·
                  </Text>
                ) : null}
                <Icon name="repeat" size={12} color={Palette.slate} />
                <Text size={12} muted>
                  {event.repeat}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
        {people.length > 1 || event.remindedLabel ? (
          <View style={styles.attendees}>
            <ViewerAvatars event={event} max={5} size={24} />
            {event.remindedLabel ? (
              <View style={styles.reminded}>
                <Icon name="bell" size={12} color={Palette.slate} />
                <Text size={12} muted>
                  {event.remindedLabel}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
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
  title: {
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  week: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 12,
  },
  today: {
    borderWidth: 1.5,
    borderColor: Palette.coral,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  section: {
    gap: 8,
  },
  eventCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 16,
  },
  timeColumn: {
    width: 52,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
  eventBody: {
    gap: 6,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  attendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  upcoming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dateColumn: {
    width: 52,
  },
});
