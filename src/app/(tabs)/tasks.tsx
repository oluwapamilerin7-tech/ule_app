import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TaskRow } from '@/components/task-row';
import { Card, SectionLabel } from '@/components/ui/card';
import { Chip, Segmented } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { canCreateTasks } from '@/state/permissions';
import { currentUser, openOverdue, tasksInScope, type TaskScope } from '@/state/selectors';
import type { Task } from '@/state/types';

type Filter = 'all' | 'overdue' | 'recurring' | 'done';

export default function TasksScreen() {
  const { state } = useHousehold();
  const me = currentUser(state);
  const member = me?.role === 'member';
  const [scope, setScope] = useState<TaskScope>(member ? 'mine' : 'household');
  const [filter, setFilter] = useState<Filter>('all');

  // A Member's "Mine" is what's assigned to or created by them; "Household" is Staff's tasks (E02).
  const staff = state.members.filter((m) => m.role === 'staff');
  const memberMine = state.tasks.filter((t) => t.assigneeId === me?.id || t.createdBy === me?.id);
  const memberStaff = state.tasks.filter((t) => staff.some((s) => s.id === t.assigneeId));
  const scoped = member ? (scope === 'mine' ? memberMine : memberStaff) : tasksInScope(state, scope);
  const overdueCount = openOverdue(scoped).length;
  const visible = scoped.filter((task) => {
    if (filter === 'overdue') return task.bucket === 'overdue' && !task.done;
    if (filter === 'recurring') return !!task.repeat;
    if (filter === 'done') return task.done;
    return true;
  });

  const sections: { key: Task['bucket']; title: string; tasks: Task[] }[] = [
    { key: 'overdue' as const, title: 'Overdue', tasks: visible.filter((t) => t.bucket === 'overdue') },
    { key: 'today' as const, title: 'Today', tasks: visible.filter((t) => t.bucket === 'today') },
    { key: 'week' as const, title: 'This week', tasks: visible.filter((t) => t.bucket === 'week') },
    { key: 'later' as const, title: 'Later', tasks: visible.filter((t) => t.bucket === 'later') },
  ].filter((section) => section.tasks.length > 0);

  return (
    <Screen tabBar gap={14}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={28} style={styles.title}>
            {member ? 'My tasks' : 'Tasks'}
          </Text>
          {member ? (
            <Text size={13} muted>
              {scope === 'mine' ? 'Assigned to you or created by you' : `Tasks for ${staff.map((s) => s.name).join(', ')}`}
            </Text>
          ) : null}
        </View>
        {me && canCreateTasks(me) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/new-task')}
            style={({ pressed }) => [styles.newTask, pressed && { opacity: 0.8 }]}>
            <Icon name="plus" size={18} />
            <Text weight="semibold" size={14}>
              New task
            </Text>
          </Pressable>
        ) : null}
      </View>

      {member && staff.length === 0 ? null : (
        <Segmented
          label="Whose tasks"
          options={
            member
              ? [
                  { value: 'mine', label: `Mine · ${memberMine.length}` },
                  { value: 'household', label: `${staff.length === 1 ? staff[0]!.name : 'Staff'} · ${memberStaff.length}` },
                ]
              : [
                  { value: 'mine', label: `Mine · ${tasksInScope(state, 'mine').length}` },
                  { value: 'household', label: `Household · ${state.tasks.length}` },
                ]
          }
          value={scope}
          onChange={setScope}
          fontSize={14}
        />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip
          label={overdueCount ? `Overdue ${overdueCount}` : 'Overdue'}
          selected={filter === 'overdue'}
          onPress={() => setFilter('overdue')}
        />
        <Chip label="Recurring" selected={filter === 'recurring'} onPress={() => setFilter('recurring')} />
        <Chip label="Done" selected={filter === 'done'} onPress={() => setFilter('done')} />
      </ScrollView>

      {sections.length === 0 ? (
        <Card padded>
          <Text size={14} muted>
            {filter === 'done' ? 'Nothing has been ticked off yet.' : 'Nothing here. Enjoy the quiet.'}
          </Text>
        </Card>
      ) : (
        sections.map((section) => {
          const alert = section.key === 'overdue';
          return (
            <View key={section.key} style={styles.section}>
              <SectionLabel title={section.title} tone={alert ? 'alert' : 'default'} />
              <Card divided tone={alert ? 'alert' : 'default'}>
                {section.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} showCreator={member} />
                ))}
              </Card>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    letterSpacing: -0.5,
  },
  newTask: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Palette.coral,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filters: {
    gap: 8,
  },
  section: {
    gap: 8,
  },
});
