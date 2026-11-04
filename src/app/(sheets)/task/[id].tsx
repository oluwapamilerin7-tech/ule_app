import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button, IconButton } from '@/components/ui/button';
import { Card, InfoNote, SectionLabel, Tag } from '@/components/ui/card';
import { Avatar } from '@/components/ui/controls';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { assignableMembers, canCompleteTask, canEditTask, canNudge } from '@/state/permissions';
import { currentUser, memberById } from '@/state/selectors';

const HISTORY_COLORS = { coral: Palette.coral, slate: Palette.slate, grey: Palette.grey } as const;

/** M01 — task detail with history (FR-06). */
export default function TaskDetailSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const [reassigning, setReassigning] = useState(false);
  // Adults see the history straight away; staff and children open it with "View".
  const [showHistory, setShowHistory] = useState(me?.role === 'admin' || me?.role === 'member');
  const task = state.tasks.find((t) => t.id === id);

  // The task list doesn't include history; fetch it for this task.
  useEffect(() => {
    if (id) void actions.loadTaskHistory(id);
  }, [actions, id]);

  if (!task || !me) return <NotFoundSheet what="Task" />;

  const assignee = memberById(state, task.assigneeId);
  const creator = memberById(state, task.createdBy);
  const finisher = memberById(state, task.doneById) ?? assignee;
  const overdue = task.bucket === 'overdue' && !task.done;
  const editable = canEditTask(me, task);
  const completable = canCompleteTask(me, task);
  const nudgeable = canNudge(state, me, task) && !task.done;
  const assigneeLabel = assignee ? (assignee.id === me.id ? `You (${assignee.name})` : assignee.name) : 'Nobody yet';

  return (
    <Sheet tall>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          {overdue ? (
            <Tag
              label={`OVERDUE · ${(task.dueLabel ?? '').replace(' late', '').toUpperCase()}`}
              background={Palette.coralTint}
              color={Palette.dangerDeep}
              size={11}
            />
          ) : task.done ? (
            <Tag label={`DONE · ${task.doneAt ?? ''}`.toUpperCase()} size={11} />
          ) : null}
          <Text accessibilityRole="header" display size={24} style={styles.title}>
            {task.title}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          {editable ? (
            <IconButton
              icon="edit"
              label="Edit task"
              variant="soft"
              onPress={() => router.replace({ pathname: '/new-task', params: { id: task.id } })}
            />
          ) : null}
          <IconButton icon="close" label="Close" variant="soft" onPress={() => router.back()} />
        </View>
      </View>

      <Card>
        <View style={styles.assignee}>
          {assignee ? <Avatar person={assignee} size={32} /> : null}
          <View style={styles.flex}>
            <Text size={12} muted>
              Assigned to
            </Text>
            <Text weight="semibold">{assigneeLabel}</Text>
          </View>
          {editable ? (
            <Pressable accessibilityRole="button" onPress={() => setReassigning((v) => !v)} hitSlop={8}>
              <Text weight="bold" size={13}>
                {reassigning ? 'Cancel' : 'Reassign'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {reassigning ? (
          <View style={styles.reassign}>
            {assignableMembers(state, me)
              .filter((m) => m.id !== task.assigneeId)
              .map((member) => (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Reassign to ${member.name}`}
                  onPress={() => {
                    actions.reassignTask(task.id, member.id);
                    setReassigning(false);
                  }}
                  style={styles.reassignOption}>
                  <Avatar person={member} size={36} />
                  <Text weight="semibold" size={12}>
                    {member.name}
                  </Text>
                </Pressable>
              ))}
          </View>
        ) : null}
        <View style={styles.grid}>
          <Fact label={overdue ? 'Was due' : 'Due'} value={task.wasDue ?? task.time ?? task.dueLabel ?? 'Today'} alert={overdue} right bottom />
          <Fact label="Repeats" value={task.repeat ?? 'Never'} bottom />
          <Fact label="Reminder" value={task.reminder ?? 'None'} right />
          <Fact label="Created by" value={creator ? (creator.id === me.id ? 'You' : creator.name) : '—'} />
        </View>
      </Card>

      {task.notes ? (
        <View style={styles.notes}>
          <Text weight="bold" size={12} muted>
            Notes
          </Text>
          <Text size={14} style={styles.notesText}>
            {task.notes}
          </Text>
        </View>
      ) : null}

      <View style={styles.history}>
        <SectionLabel
          title="History"
          right={
            <Pressable accessibilityRole="button" onPress={() => setShowHistory((v) => !v)} hitSlop={8}>
              <Text weight="bold" size={13}>
                {showHistory ? 'Hide' : 'View'}
              </Text>
            </Pressable>
          }
        />
        {showHistory
          ? task.history.map((entry, index) => (
              <View key={`${entry.label}-${index}`} style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: HISTORY_COLORS[entry.tone] }]} />
                <Text size={13} style={styles.flex}>
                  {entry.label}
                </Text>
                <Text size={13} muted>
                  {entry.when}
                </Text>
              </View>
            ))
          : null}
        {showHistory && task.repeat ? (
          <Text size={12} muted>
            Repeats {task.repeat.toLowerCase()} — earlier rounds are listed here too.
          </Text>
        ) : null}
      </View>

      {!editable && me.role === 'member' && creator ? (
        <InfoNote icon="lock">
          <Text size={13}>
            {creator.name} created this task, so only {creator.name} or an admin can edit, reassign or delete it.
          </Text>
        </InfoNote>
      ) : null}

      <View style={styles.flex} />

      <View style={styles.actions}>
        {completable && task.notYet ? (
          <View style={styles.status}>
            <Text weight="bold" size={16}>
              Not due yet
            </Text>
            <Text size={13} muted>
              You can mark this as done on {(task.dueLabel ?? 'the day').split(',')[0]}.
            </Text>
          </View>
        ) : completable ? (
          task.done ? (
            <Button label="Mark as not done" variant="outline" onPress={() => actions.toggleTask(task.id)} />
          ) : (
            <Button
              label="Mark as done"
              icon="check"
              onPress={() => {
                actions.completeTask(task.id);
                router.replace(`/task-done/${task.id}`);
              }}
            />
          )
        ) : (
          <View style={styles.status}>
            <Text weight="bold" size={16}>
              {task.done
                ? `Done by ${finisher?.name ?? 'someone'}${task.doneAt ? ` · ${task.doneAt}` : ''}`
                : `Waiting on ${assignee?.name ?? 'someone to pick it up'}`}
            </Text>
            {assignee ? (
              <Text size={13} muted>
                Only {assignee.name} can mark this as done.
              </Text>
            ) : null}
          </View>
        )}
        {nudgeable || editable ? (
          <View style={styles.pair}>
            {nudgeable && assignee ? (
              <Button
                label={`Nudge ${assignee.name}`}
                variant="outline"
                size="md"
                onPress={() => router.push(`/nudge/${task.id}`)}
                style={styles.flex}
              />
            ) : null}
            {editable ? (
              <Button
                label="Delete"
                variant="danger-outline"
                size="md"
                onPress={() => router.push(`/delete-task/${task.id}`)}
                style={styles.flex}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

function Fact({
  label,
  value,
  alert,
  right,
  bottom,
}: {
  label: string;
  value: string;
  alert?: boolean;
  right?: boolean;
  bottom?: boolean;
}) {
  return (
    <View style={[styles.fact, right && styles.factRight, bottom && styles.factBottom]}>
      <Text size={12} muted>
        {label}
      </Text>
      <Text weight="semibold" color={alert ? Palette.danger : Palette.ink}>
        {value}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 6,
  },
  title: {
    lineHeight: 28,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  assignee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  reassign: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    backgroundColor: Palette.muted,
  },
  reassignOption: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fact: {
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  factRight: {
    borderRightWidth: 1,
    borderRightColor: Palette.divider,
  },
  factBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
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
  history: {
    gap: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actions: {
    gap: 10,
  },
  status: {
    gap: 2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Palette.muted,
  },
  pair: {
    flexDirection: 'row',
    gap: 10,
  },
});
