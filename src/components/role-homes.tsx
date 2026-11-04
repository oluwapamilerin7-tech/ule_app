import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { eventViewers, InvitationCard, pendingInvitations, ViewerAvatars } from '@/components/event-people';
import { TaskRow } from '@/components/task-row';
import { Button, IconButton } from '@/components/ui/button';
import { Card, InfoNote, SectionLabel } from '@/components/ui/card';
import { Avatar } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { addDays, formatHeaderDate, weekdayShort } from '@/lib/dates';
import { useHousehold } from '@/state/household';
import { canCreateEvents, canSendRequests } from '@/state/permissions';
import { memberById, roleTitle, tasksFor, unreadCount } from '@/state/selectors';
import type { CalendarEvent, HouseholdState, Member } from '@/state/types';

/** Events this person can see from today on, soonest first. */
export function upcomingFor(state: HouseholdState, member: Member, days = 31) {
  return state.events
    .filter((e) => e.dayOffset >= 0 && e.dayOffset <= days && eventViewers(state, e).some((v) => v.id === member.id))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * Every role's Home header: the date, then the greeting with the avatar (→ settings) and bell
 * (→ notifications) aligned to its bottom, then the household — a switcher when there's more
 * than one (H01–H12), plain text otherwise.
 */
export function HomeHeader({ member, preview, greeting = 'Hi!' }: { member: Member; preview?: boolean; greeting?: string }) {
  const { state } = useHousehold();
  const unread = preview ? 0 : unreadCount(state);
  const many = !preview && state.myHouseholds.length > 1;
  return (
    <View style={styles.headerBlock}>
      <Text weight="medium" size={13} muted>
        {formatHeaderDate(new Date())}
      </Text>
      <View style={styles.header}>
        <Text accessibilityRole="header" display size={30} style={[styles.flex, styles.title]}>
          {greeting} {member.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile and settings"
          disabled={preview}
          onPress={() => router.push('/settings')}>
          <Avatar person={member} size={44} />
        </Pressable>
        <IconButton
          icon="bell"
          iconSize={20}
          label={`Notifications, ${unread} new`}
          badge={unread > 0}
          onPress={preview ? undefined : () => router.push('/notifications')}
        />
      </View>
      {many ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${state.household.name}. Switch household`}
          onPress={() => router.push('/households')}
          style={({ pressed }) => [styles.switcher, pressed && { backgroundColor: Palette.muted }]}>
          <Icon name="home" size={14} />
          <Text weight="bold" size={13} numberOfLines={1} style={styles.switcherName}>
            {state.household.name}
          </Text>
          <Icon name="chevron-down" size={14} />
        </Pressable>
      ) : (
        <Text weight="semibold" size={13} muted numberOfLines={1}>
          {state.household.name}
        </Text>
      )}
    </View>
  );
}

const ROLE_HERE: Partial<Record<Member['role'], string>> = {
  member: 'you’ll see your own tasks and what’s shared with you',
  staff: 'you’ll see your duties here, events shared with you and the shopping list when you shop',
  child: 'you see your own jobs and the events shared with you',
};

/**
 * H07 / H12 — "You're a Member here. Oma runs this household, …": shown to people in more
 * than one household, where their role here isn't Admin.
 */
export function HouseholdRoleNote({ member }: { member: Member }) {
  const { state } = useHousehold();
  const here = state.myHouseholds.find((h) => h.id === state.household.id);
  const sees = ROLE_HERE[member.role];
  if (state.myHouseholds.length < 2 || !sees) return null;
  return (
    <InfoNote icon="alert" style={styles.roleNote}>
      <Text size={13} style={styles.roleNoteText}>
        You’re {member.role === 'staff' ? 'Staff' : `a ${roleTitle(member)}`} here.
        {here?.primaryAdminName ? ` ${here.primaryAdminName} runs this household, so ` : ' Here '}
        {sees}.
      </Text>
    </InfoNote>
  );
}

/** H07 — "Back to The Bello Household · 2 overdue · 2 requests to review". */
export function OtherHouseholds() {
  const { state, actions } = useHousehold();
  const others = state.myHouseholds.filter((h) => h.id !== state.household.id);
  if (!others.length) return null;
  const go = async (id: string) => {
    try {
      await actions.switchHousehold(id);
      router.replace('/home');
    } catch {
      router.push('/households');
    }
  };
  return (
    <View style={styles.section}>
      {others.map((h) => {
        const detail = [
          h.overdue ? `${h.overdue} overdue` : null,
          h.toReview ? `${h.toReview} ${h.toReview === 1 ? 'request' : 'requests'} to review` : null,
        ].filter(Boolean);
        return (
          <Pressable
            key={h.id}
            accessibilityRole="button"
            onPress={() => go(h.id)}
            style={({ pressed }) => [styles.other, pressed && { backgroundColor: Palette.muted }]}>
            <View style={styles.otherIcon}>
              <Icon name="home" size={20} color={Palette.danger} />
            </View>
            <View style={styles.flex}>
              <Text weight="semibold">Back to {h.name}</Text>
              <Text size={12} muted>
                {roleTitle(h)}
                {detail.length ? ` · ${detail.join(' · ')}` : ' · all clear'}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={Palette.slate} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** "MON 28" date block used by the compact event lists. */
function EventList({ events, note }: { events: CalendarEvent[]; note: (e: CalendarEvent) => string }) {
  const today = new Date();
  if (events.length === 0) {
    return (
      <Card padded>
        <Text size={14} muted>
          Nothing on the calendar.
        </Text>
      </Card>
    );
  }
  return (
    <Card divided>
      {events.map((event) => {
        const date = addDays(today, event.dayOffset);
        return (
          <Pressable
            key={event.key}
            accessibilityRole="button"
            onPress={() => router.push(`/event/${event.id}`)}
            style={styles.event}>
            <View style={styles.date}>
              <Text weight="bold" size={11} muted>
                {event.dayOffset === 0 ? 'TODAY' : weekdayShort(date).toUpperCase()}
              </Text>
              <Text weight="bold" size={17}>
                {date.getDate()}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text weight="semibold">{event.title}</Text>
              <Text size={12} muted>
                {[event.allDay ? 'All day' : event.start, note(event)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <ViewerAvatars event={event} max={3} size={20} />
          </Pressable>
        );
      })}
    </Card>
  );
}

/** "You're shopping today · 6 items · 2 in your basket" — only shown to today's shopper. */
function ShopperCard() {
  const { state } = useHousehold();
  const inBasket = state.shopping.filter((i) => i.inBasket).length;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.navigate('/shopping')}
      style={({ pressed }) => [styles.requests, styles.shopperCard, pressed && { opacity: 0.8 }]}>
      <View style={[styles.requestsIcon, { backgroundColor: Palette.coral }]}>
        <Icon name="cart" size={20} color={Palette.ink} />
      </View>
      <View style={styles.flex}>
        <Text weight="bold">{`You're shopping ${state.shopper.when.toLowerCase()}`}</Text>
        <Text size={12} muted>
          {state.shopping.length} {state.shopping.length === 1 ? 'item' : 'items'} on the list · {inBasket} in your basket
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color={Palette.slate} />
    </Pressable>
  );
}

/** US-07 / design 11: Staff Home — today's duties, then events they're invited to (view only). */
export function StaffHome({ member, preview }: { member: Member; preview?: boolean }) {
  const { state, actions } = useHousehold();
  const duties = tasksFor(state, member.id).filter((t) => t.bucket === 'overdue' || t.bucket === 'today');
  const done = duties.filter((t) => t.done).length;
  const next = duties.find((t) => !t.done);
  const creator = next ? memberById(state, next.createdBy) : undefined;
  const events = upcomingFor(state, member, 14);

  return (
    <>
      <HomeHeader member={member} preview={preview} />
      {preview ? null : <HouseholdRoleNote member={member} />}

      <Card padded style={styles.progress}>
        <View style={styles.progressTop}>
          <Text weight="bold" size={16}>
            {"Today's duties"}
          </Text>
          <Text weight="bold">
            {done} of {duties.length} done
          </Text>
        </View>
        <View style={styles.bars}>
          {duties.map((task) => (
            <View key={task.id} style={[styles.bar, task.done && styles.barDone]} />
          ))}
        </View>
      </Card>

      {next ? (
        <Card tone="strong" style={styles.next}>
          <View style={styles.nextText}>
            <Text weight="bold" size={13}>
              NEXT{next.time ? ` · ${next.time}` : ''}
            </Text>
            <Text weight="bold" size={20}>
              {next.title}
            </Text>
            {next.notes ? (
              <Text size={14} muted style={styles.notes}>
                Note from {creator?.name ?? 'the household'}: {next.notes}
              </Text>
            ) : null}
          </View>
          <Button
            label="Mark as done"
            icon="check"
            disabled={preview}
            onPress={() => actions.completeTask(next.id)}
            style={styles.doneButton}
          />
        </Card>
      ) : (
        <Card padded>
          <Text weight="bold" size={17}>
            All done for today
          </Text>
          <Text size={14} muted>
            Nice work. New duties will show up here.
          </Text>
        </Card>
      )}

      {!preview && state.shopper.memberId === member.id ? <ShopperCard /> : null}

      {duties.length > 1 ? (
        <Card divided>
          {duties
            .filter((t) => t.id !== next?.id)
            .map((task) => (
              <TaskRow key={task.id} task={task} large showAvatar={false} onOpen={preview ? null : undefined} />
            ))}
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionLabel
          title="Coming up"
          right={
            <Text weight="semibold" size={12} muted>
              View only · you get reminders
            </Text>
          }
        />
        <EventList
          events={events.slice(0, 4)}
          note={(e) => {
            const by = memberById(state, e.createdBy);
            return [e.notes ?? e.place, by ? `invited by ${by.name}` : null].filter(Boolean).join(' · ');
          }}
        />
      </View>

      <InfoNote icon="lock" tone="plain">
        <Text size={13} muted>
          You see only duties assigned to you and events shared with you.
        </Text>
      </InfoNote>
      {preview ? null : <OtherHouseholds />}
    </>
  );
}

/** US-04 / design 12: a child's Home — jobs, their shopping requests and events shared with them. */
export function ChildHome({ member, preview }: { member: Member; preview?: boolean }) {
  const { state } = useHousehold();
  const jobs = tasksFor(state, member.id).filter((t) => t.bucket === 'overdue' || t.bucket === 'today');
  const done = jobs.filter((t) => t.done).length;
  const remaining = jobs.filter((t) => !t.done);
  const events = upcomingFor(state, member, 14);
  const invitations = preview ? [] : pendingInvitations(state);
  const myRequests = preview ? [] : state.requests.filter((r) => r.requesterId === member.id);
  const waiting = myRequests.filter((r) => r.status === 'pending').length;

  return (
    <>
      <HomeHeader member={member} preview={preview} />
      {preview ? null : <HouseholdRoleNote member={member} />}

      <View style={styles.score}>
        <Text display size={40} color={Palette.white} style={styles.scoreValue}>
          {done}/{jobs.length}
        </Text>
        <Text size={15} color={Palette.line} style={styles.flex}>
          {remaining.length === 0
            ? 'jobs done today. All finished!'
            : `jobs done today. ${remaining.length === 1 ? 'One' : remaining.length} left${
                remaining[0]?.time ? ` ${remaining[0].time.replace(/^Before /, 'before ')}` : ''
              }.`}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionLabel title="My jobs" />
        {jobs.length ? (
          <Card divided>
            {jobs.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                large
                showAvatar={false}
                showCreator
                onOpen={preview ? null : undefined}
              />
            ))}
          </Card>
        ) : (
          <Card padded>
            <Text size={14} muted>
              No jobs today.
            </Text>
          </Card>
        )}
      </View>

      {!preview && state.shopper.memberId === member.id ? <ShopperCard /> : null}

      {canSendRequests(member) ? (
        <Pressable
          accessibilityRole="button"
          disabled={preview}
          onPress={() => router.push(myRequests.length ? '/requests' : '/request-items')}
          style={({ pressed }) => [styles.requests, pressed && { opacity: 0.8 }]}>
          <View style={styles.requestsIcon}>
            <Icon name="cart" size={20} color={Palette.danger} />
          </View>
          <View style={styles.flex}>
            <Text weight="semibold">My requests</Text>
            <Text size={12} muted>
              {waiting ? `${waiting} awaiting approval · request more items` : 'Ask for things you need'}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={Palette.slate} />
        </Pressable>
      ) : null}

      {invitations.length ? (
        <View style={styles.section}>
          <SectionLabel title="Invitations" />
          {invitations.map((event) => (
            <InvitationCard key={event.id} event={event} />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionLabel
          title="Coming up"
          right={
            canCreateEvents(member) && !preview ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/new-event')} hitSlop={8}>
                <Text weight="bold" size={13}>
                  + New event
                </Text>
              </Pressable>
            ) : null
          }
        />
        <Text size={12} muted>
          Only events shared with you
        </Text>
        <EventList events={events.slice(0, 4)} note={(e) => e.notes ?? e.place ?? ''} />
      </View>
      {preview ? null : <OtherHouseholds />}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerBlock: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    // The avatar and bell sit on the greeting's baseline row, aligned to its bottom.
    alignItems: 'flex-end',
    gap: 10,
  },
  title: {
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  switcher: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    maxWidth: '100%',
    paddingLeft: 12,
    paddingRight: 10,
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  switcherName: {
    flexShrink: 1,
  },
  roleNote: {
    backgroundColor: Palette.slateTint,
  },
  roleNoteText: {
    lineHeight: 19,
    color: Palette.slateDeep,
  },
  other: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  otherIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: Palette.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 8,
  },
  progress: {
    gap: 10,
    paddingHorizontal: 16,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.line,
  },
  barDone: {
    backgroundColor: Palette.ink,
  },
  next: {
    padding: 16,
    gap: 12,
    borderRadius: 18,
  },
  nextText: {
    gap: 4,
  },
  notes: {
    lineHeight: 20,
  },
  doneButton: {
    height: 56,
    borderRadius: 14,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Palette.ink,
    borderRadius: 18,
    padding: 16,
  },
  scoreValue: {
    lineHeight: 44,
  },
  requests: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  shopperCard: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
  },
  requestsIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.coralTint,
  },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  date: {
    width: 44,
  },
});
