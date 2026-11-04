import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { composeHref, composeKinds } from '@/components/compose';
import { eventViewers, eventWhen, InvitationCard, pendingInvitations, ViewerAvatars } from '@/components/event-people';
import { EmptyHomeIllustration } from '@/components/illustrations';
import { ChildHome, HomeHeader, HouseholdRoleNote, OtherHouseholds, StaffHome } from '@/components/role-homes';
import { TaskRow } from '@/components/task-row';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel, Tag } from '@/components/ui/card';
import { Avatar, Segmented } from '@/components/ui/controls';
import { Fab } from '@/components/ui/fab';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { formatNaira } from '@/lib/money';
import { SUGGESTED_ROUTINES } from '@/state/demo-data';
import { useHousehold } from '@/state/household';
import { canNudge, myInvite } from '@/state/permissions';
import {
  currentUser,
  memberById,
  openOverdue,
  openToday,
  shoppingTotals,
  stockCounts,
  tasksInScope,
  type TaskScope,
} from '@/state/selectors';
import type { CalendarEvent, Member } from '@/state/types';

const SCOPES = [
  { value: 'mine', label: 'My view' },
  { value: 'household', label: 'Household view' },
] as const;

/** Home differs by role: Admin (04), Member (E01), Staff (11) and Child (12). */
export default function HomeScreen() {
  const { state } = useHousehold();
  const me = currentUser(state);
  if (!me) return <Screen tabBar>{null}</Screen>;
  if (me.role === 'staff') {
    return (
      <Screen tabBar>
        <StaffHome member={me} />
      </Screen>
    );
  }
  if (me.role === 'child') {
    return (
      <Screen tabBar>
        <ChildHome member={me} />
      </Screen>
    );
  }
  if (me.role === 'member') return <MemberHome />;
  return <AdminHome />;
}

function QuickAdd() {
  const { state } = useHousehold();
  const kinds = composeKinds(currentUser(state));
  if (!kinds.length) return null;
  return <Fab label="Quick add a task, event or item" onPress={() => router.push(composeHref(kinds[0]!))} />;
}

/** "Ayo sent a shopping list (6 items)" — lists waiting for an Admin. */
function RequestsToReview() {
  const { state } = useHousehold();
  const pending = state.requests.filter((r) => r.status === 'pending');
  if (!pending.length) return null;
  return (
    <Card divided>
      {pending.map((request) => {
        const who = memberById(state, request.requesterId);
        const n = request.items.length;
        return (
          <Pressable
            key={request.id}
            accessibilityRole="button"
            onPress={() => router.push(`/requests/${request.id}`)}
            style={({ pressed }) => [styles.summary, pressed && { backgroundColor: Palette.muted }]}>
            {who ? <Avatar person={who} size={32} /> : null}
            <Text weight="semibold" style={styles.flex}>
              {who?.role === 'child'
                ? `${request.requesterName} sent a shopping list (${n} ${n === 1 ? 'item' : 'items'})`
                : `${request.requesterName} requested ${n} ${n === 1 ? 'item' : 'items'}`}
            </Text>
            <View style={styles.nudge}>
              <Text weight="semibold" size={13}>
                Review
              </Text>
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

function AdminHome() {
  const { state } = useHousehold();
  const [scope, setScope] = useState<TaskScope>('household');
  const me = currentUser(state)!;

  const fab = <QuickAdd />;

  if (state.tasks.length === 0) {
    return <EmptyHome member={me} fab={fab} />;
  }

  const tasks = tasksInScope(state, scope);
  const overdue = openOverdue(tasks);
  const dueToday = openToday(tasks);
  const todayTasks = tasks.filter((t) => t.bucket === 'today');
  const todaysEvents = state.events.filter(
    (e) => e.dayOffset === 0 && (scope === 'household' || eventViewers(state, e).some((v) => v.id === me.id)),
  );
  const invitations = pendingInvitations(state);
  const hasRequests = state.requests.some((r) => r.status === 'pending');
  const totals = shoppingTotals(state);
  const stock = stockCounts(state);
  const shopper = memberById(state, state.shopper.memberId);
  const outItems = state.inventory.filter((i) => i.status === 'out');
  const lowItems = state.inventory.filter((i) => i.status === 'low');
  const pending = state.sync.pending.length;

  return (
    <Screen tabBar gap={18} overlay={fab}>
      <HomeHeader member={me} />

      <View style={styles.scopeRow}>
        <Segmented
          label="Whose items"
          options={SCOPES}
          value={scope}
          onChange={setScope}
          height={34}
          style={styles.flex}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sync')}
          style={styles.syncChip}
          hitSlop={6}>
          <Icon name={pending ? 'sync' : 'check'} size={14} color={Palette.slate} />
          <Text weight="semibold" size={12} muted>
            {pending ? `${pending} waiting` : 'Synced'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.stats}>
        <StatTile value={overdue.length} label="Overdue" tone="alert" href="/tasks" />
        <StatTile value={dueToday.length} label="Due today" tone="plain" href="/tasks" />
        <StatTile value={stock.low + stock.out} label="Running low" tone="slate" href="/inventory" />
      </View>

      {overdue.length > 0 || hasRequests ? (
        <View style={styles.section}>
          <SectionLabel title="Needs attention" tone="alert" />
          <RequestsToReview />
          {overdue.map((task) => (
            <Card key={task.id} tone="alert">
              <TaskRow
                task={task}
                showName
                trailing={
                  canNudge(state, me, task) ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/nudge/${task.id}`)}
                      style={styles.nudge}>
                      <Text weight="semibold" size={13}>
                        Nudge
                      </Text>
                    </Pressable>
                  ) : undefined
                }
                showAvatar={false}
              />
            </Card>
          ))}
        </View>
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
          title="Today"
          right={
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/tasks')} hitSlop={8}>
              <Text weight="semibold" size={13}>
                See all
              </Text>
            </Pressable>
          }
        />
        {todaysEvents.length + todayTasks.length === 0 ? (
          <Card padded>
            <Text size={14} muted>
              Nothing else due today.
            </Text>
          </Card>
        ) : (
          <Card divided>
            {todaysEvents.map((event) => (
              <EventLine key={event.key} event={event} />
            ))}
            {todayTasks.slice(0, 5).map((task) => (
              <TaskRow key={task.id} task={task} showName />
            ))}
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <SectionLabel title="Shopping & low stock" />
        <Card divided>
          <SummaryLink
            icon="cart"
            iconTone="coral"
            href="/shopping"
            title={`${totals.count} items · ${formatNaira(totals.total)}`}
            subtitle={[
              shopper ? `${shopper.name} is shopping ${state.shopper.when.toLowerCase()}` : 'No shopper yet',
              totals.unpriced ? `${totals.unpriced} ${totals.unpriced === 1 ? 'item needs' : 'items need'} a price` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
          <SummaryLink
            icon="box"
            iconTone="slate"
            href="/inventory"
            title={
              <>
                {outItems.length > 0 ? (
                  <Text weight="semibold" color={Palette.danger}>
                    {outItems[0].name.replace(/\s*\(.*\)/, '')} is out
                  </Text>
                ) : null}
                {outItems.length > 0 ? ' · ' : ''}
                {lowItems.length} running low
              </>
            }
            subtitle={lowItems.map((i) => i.name).join(', ') || 'Everything is stocked'}
          />
        </Card>
      </View>
      <OtherHouseholds />
    </Screen>
  );
}

function StatTile({
  value,
  label,
  tone,
  href,
}: {
  value: number;
  label: string;
  tone: 'alert' | 'plain' | 'slate';
  href: Href;
}) {
  const color = tone === 'alert' ? Palette.dangerDeep : tone === 'slate' ? Palette.slateDeep : Palette.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      onPress={() => router.navigate(href)}
      style={[
        styles.stat,
        tone === 'alert' && { backgroundColor: Palette.coralTint },
        tone === 'plain' && styles.statPlain,
        tone === 'slate' && { backgroundColor: Palette.slateTint },
      ]}>
      <Text display size={26} color={color}>
        {value}
      </Text>
      <Text weight="semibold" size={12} color={tone === 'plain' ? Palette.slate : color}>
        {label}
      </Text>
    </Pressable>
  );
}

/** E01: Enitan's Home — own tasks, events shared with him, the shopping trip and supplies. */
function MemberHome() {
  const { state } = useHousehold();
  const me = currentUser(state)!;
  const mine = state.tasks.filter((t) => t.assigneeId === me.id || t.createdBy === me.id);
  const assigned = mine.filter((t) => t.assigneeId === me.id);
  const overdue = openOverdue(assigned);
  const dueToday = openToday(assigned);
  const myTasks = mine.filter(
    (t) => (t.bucket === 'overdue' || t.bucket === 'today') && (t.assigneeId === me.id || !t.done),
  );
  const stock = stockCounts(state);
  const outItems = state.inventory.filter((i) => i.status === 'out');
  const lowItems = state.inventory.filter((i) => i.status === 'low');
  const shopper = memberById(state, state.shopper.memberId);
  const inMyBasket = state.shopping.filter((i) => i.inBasket).length;
  const upcoming = state.events.filter(
    (e) => e.dayOffset >= 0 && e.createdBy !== me.id && myInvite(me, e) && myInvite(me, e)!.response !== 'invited',
  );
  const invitations = pendingInvitations(state);
  const myWaiting = state.requests.filter((r) => r.requesterId === me.id && r.status === 'pending').length;

  return (
    <Screen tabBar gap={18} overlay={<QuickAdd />}>
      <HomeHeader member={me} />
      <HouseholdRoleNote member={me} />

      <View style={styles.stats}>
        <StatTile value={overdue.length} label="My overdue" tone="alert" href="/tasks" />
        <StatTile value={dueToday.length} label="Due today" tone="plain" href="/tasks" />
        <StatTile value={stock.low + stock.out} label="Running low" tone="slate" href="/inventory" />
      </View>

      <View style={styles.section}>
        <SectionLabel
          title="My tasks"
          right={
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/tasks')} hitSlop={8}>
              <Text weight="semibold" size={13}>
                See all
              </Text>
            </Pressable>
          }
        />
        {myTasks.length ? (
          <Card divided>
            {myTasks.slice(0, 5).map((task) => (
              <TaskRow key={task.id} task={task} showCreator showName={task.assigneeId !== me.id} />
            ))}
          </Card>
        ) : (
          <Card padded>
            <Text size={14} muted>
              Nothing due for you.
            </Text>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <SectionLabel
          title="Events shared with you"
          right={
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/calendar')} hitSlop={8}>
              <Text weight="semibold" size={13}>
                Calendar
              </Text>
            </Pressable>
          }
        />
        {upcoming.slice(0, 3).map((event) => {
          const by = memberById(state, event.createdBy);
          const reply = myInvite(me, event)?.response;
          return (
            <Card key={event.key}>
              <Pressable accessibilityRole="button" onPress={() => router.push(`/event/${event.id}`)} style={styles.summary}>
                <View style={styles.flex}>
                  <Text weight="semibold">{event.title}</Text>
                  <Text size={12} muted>
                    {[eventWhen(event), by ? `invited by ${by.name}` : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Tag
                  label={reply === 'accepted' ? 'Accepted' : 'Declined'}
                  background={reply === 'accepted' ? Palette.slateTint : Palette.muted}
                  color={reply === 'accepted' ? Palette.slateDeep : Palette.slate}
                  size={11}
                />
              </Pressable>
            </Card>
          );
        })}
        {invitations.map((event) => (
          <InvitationCard key={event.id} event={event} />
        ))}
        {upcoming.length + invitations.length === 0 ? (
          <Card padded>
            <Text size={14} muted>
              No events shared with you yet.
            </Text>
          </Card>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionLabel
          title="Shopping & supplies"
          right={
            <Pressable accessibilityRole="button" onPress={() => router.push('/request-items')} hitSlop={8}>
              <Text weight="bold" size={13}>
                + Create list
              </Text>
            </Pressable>
          }
        />
        <Card divided>
          {shopper?.id === me.id ? (
            <SummaryLink
              icon="cart"
              iconTone="coral"
              href="/shopping"
              title={`You're shopping ${state.shopper.when.toLowerCase()}`}
              subtitle={`${state.shopping.length} ${state.shopping.length === 1 ? 'item' : 'items'} on the list · ${inMyBasket} in your basket`}
            />
          ) : (
            <SummaryLink
              icon="send"
              iconTone="coral"
              href="/requests"
              title="My shopping lists"
              subtitle={myWaiting ? `${myWaiting} waiting for approval` : 'Send a list for approval'}
            />
          )}
          <SummaryLink
            icon="box"
            iconTone="slate"
            href="/inventory"
            title={
              <>
                {outItems.length > 0 ? (
                  <Text weight="semibold" color={Palette.danger}>
                    {outItems[0].name.replace(/\s*\(.*\)/, '')} is out
                  </Text>
                ) : null}
                {outItems.length > 0 ? ' · ' : ''}
                {lowItems.length} running low
              </>
            }
            subtitle={lowItems.map((i) => i.name).join(', ') || 'Everything is stocked'}
          />
        </Card>
      </View>
      <OtherHouseholds />
    </Screen>
  );
}

function EventLine({ event }: { event: CalendarEvent }) {
  const { state } = useHousehold();
  const who = eventViewers(state, event)
    .map((m) => m.name)
    .join(', ');
  const when = event.allDay ? 'All day' : [event.start, event.end].filter(Boolean).join(' – ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/event/${event.id}`)}
      style={styles.eventLine}>
      <View style={[styles.eventBar, { backgroundColor: event.accent }]} />
      <View style={styles.flex}>
        <Text weight="semibold">{event.title}</Text>
        <Text size={12} muted>
          {[when, who].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <ViewerAvatars event={event} max={3} size={22} />
    </Pressable>
  );
}

function SummaryLink({
  icon,
  iconTone,
  href,
  title,
  subtitle,
}: {
  icon: IconName;
  iconTone: 'coral' | 'slate';
  href: Href;
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.navigate(href)}
      style={({ pressed }) => [styles.summary, pressed && { backgroundColor: Palette.muted }]}>
      <View
        style={[
          styles.summaryIcon,
          { backgroundColor: iconTone === 'coral' ? Palette.coralTint : Palette.slateTint },
        ]}>
        <Icon name={icon} size={20} color={iconTone === 'coral' ? Palette.danger : Palette.slateDeep} />
      </View>
      <View style={styles.flex}>
        <Text weight="semibold">{title}</Text>
        <Text size={12} muted>
          {subtitle}
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color={Palette.slate} />
    </Pressable>
  );
}

function EmptyHome({ member, fab }: { member: Member; fab: ReactNode }) {
  return (
    <Screen tabBar gap={18} overlay={fab}>
      <HomeHeader member={member} greeting="Welcome," />
      <Card padded style={styles.emptyCard}>
        <EmptyHomeIllustration />
        <Text display size={20}>
          Nothing due yet
        </Text>
        <Text size={14} muted style={styles.emptyCopy}>
          Start with a routine your home already has. Tap to add it — you can change who and when.
        </Text>
      </Card>
      <View style={styles.section}>
        <SectionLabel title="Suggested routines" />
        {SUGGESTED_ROUTINES.slice(0, 3).map((routine) => (
          <Pressable
            key={routine.title}
            accessibilityRole="button"
            accessibilityLabel={`Add ${routine.title}`}
            onPress={() =>
              router.push({ pathname: '/new-task', params: { title: routine.title, repeat: routine.repeat } })
            }
            style={({ pressed }) => [styles.routine, pressed && { opacity: 0.7 }]}>
            <View style={styles.flex}>
              <Text weight="semibold">{routine.title}</Text>
              <Text size={12} color={Palette.slateDeep}>
                {routine.caption}
              </Text>
            </View>
            <View style={styles.routinePlus}>
              <Icon name="plus" size={16} />
            </View>
          </Pressable>
        ))}
      </View>
      <Button
        label="Invite someone to share the load"
        variant="subtle"
        icon="user-plus"
        onPress={() => router.push('/invite')}
        style={styles.inviteButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -6,
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  statPlain: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  section: {
    gap: 8,
  },
  nudge: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Palette.line,
    justifyContent: 'center',
  },
  eventLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  eventBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderRadius: 20,
  },
  emptyCopy: {
    textAlign: 'center',
    lineHeight: 21,
  },
  routine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.mist,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  routinePlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButton: {
    borderStyle: 'dashed',
    borderColor: Palette.grey,
    borderRadius: 16,
  },
});
