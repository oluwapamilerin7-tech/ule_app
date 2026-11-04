import { router } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, CheckCircle } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { canCompleteTask } from '@/state/permissions';
import { currentUser, memberById } from '@/state/selectors';
import type { Task } from '@/state/types';

type TaskRowProps = {
  task: Task;
  /** Include the assignee's name in the meta line ("4:00pm · Tunde"). */
  showName?: boolean;
  showAvatar?: boolean;
  trailing?: ReactNode;
  /** Bigger rows for the staff and child views. */
  large?: boolean;
  /** Prefix for the "from" line in the child view, e.g. "from Deborah". */
  showCreator?: boolean;
  onToggle?: () => void;
  /** Where tapping the title goes; defaults to the task detail sheet. */
  onOpen?: (() => void) | null;
};

export function TaskRow({
  task,
  showName,
  showAvatar = true,
  trailing,
  large,
  showCreator,
  onToggle,
  onOpen,
}: TaskRowProps) {
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const assignee = memberById(state, task.assigneeId);
  const creator = memberById(state, task.createdBy);
  const finisher = memberById(state, task.doneById) ?? assignee;
  const overdue = task.bucket === 'overdue' && !task.done;
  // Only the assignee marks a task done; everyone else sees its status.
  const mine = !!me && canCompleteTask(me, task);

  const meta: ReactNode[] = [];
  if (task.done) {
    meta.push(
      showName && finisher && finisher.id !== me?.id
        ? `Done by ${finisher.name} · ${task.doneAt ?? ''}`
        : `Done ${task.doneAt ?? ''}`,
    );
    if (showCreator && creator && creator.id !== me?.id) meta.push(`from ${creator.name}`);
  } else {
    if (overdue && task.dueLabel) {
      meta.push(
        <Text key="late" weight="bold" size={large ? 13 : 12} color={Palette.danger}>
          {task.dueLabel}
        </Text>,
      );
    } else if (task.time || task.dueLabel) {
      meta.push(task.time ?? task.dueLabel);
    }
    if (showName) meta.push(assignee ? (assignee.id === state.currentUserId ? 'You' : assignee.name) : 'Unassigned');
    if (showCreator && creator) meta.push(creator.id === me?.id ? 'you created this' : `from ${creator.name}`);
    if (task.context) meta.push(task.context);
  }

  // A future round of a recurring task can't be ticked off before its day.
  const toggle = mine && !task.notYet ? (onToggle ?? (() => actions.toggleTask(task.id))) : undefined;
  const open = onOpen === undefined ? () => router.push(`/task/${task.id}`) : onOpen;
  const metaSize = large ? 13 : 12;

  return (
    <View style={[styles.row, large && styles.rowLarge]}>
      <CheckCircle
        done={task.done}
        onPress={toggle}
        size={large ? 30 : 26}
        tone={overdue ? 'alert' : 'default'}
        label={
          mine && task.notYet
            ? `${task.title}: you can tick this off on ${task.dueLabel ?? 'the day'}`
            : mine
            ? `Mark ${task.title} as ${task.done ? 'not done' : 'done'}`
            : `${task.title}: ${task.done ? 'done' : `waiting on ${assignee?.name ?? 'someone'}`}`
        }
      />
      <Pressable
        disabled={!open}
        onPress={open ?? undefined}
        accessibilityRole={open ? 'button' : undefined}
        style={styles.body}>
        <Text
          weight="semibold"
          size={large ? 17 : 15}
          color={task.done ? Palette.slate : Palette.ink}
          style={task.done && styles.struck}>
          {task.title}
        </Text>
        {meta.length > 0 || (task.repeat && !task.done) ? (
          <View style={styles.meta}>
            {meta.map((part, index) => (
              <Fragment key={index}>
                {index > 0 ? (
                  <Text size={metaSize} muted>
                    ·
                  </Text>
                ) : null}
                {typeof part === 'string' ? (
                  <Text size={metaSize} muted>
                    {part}
                  </Text>
                ) : (
                  part
                )}
              </Fragment>
            ))}
            {task.repeat && (!task.done || !showName) ? (
              <>
                {meta.length > 0 ? (
                  <Text size={metaSize} muted>
                    ·
                  </Text>
                ) : null}
                <Icon name="repeat" size={12} color={Palette.slate} />
                <Text size={metaSize} muted>
                  {task.repeat}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
      </Pressable>
      {trailing ?? (showAvatar && assignee ? <Avatar person={assignee} size={28} /> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowLarge: {
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
});
