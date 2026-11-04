import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { BackButton, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { formatLongDate } from '@/lib/dates';
import { useHousehold } from '@/state/household';
import { currentUser, shortHouseholdName } from '@/state/selectors';
import type { Task } from '@/state/types';

type LabelledTask = Task & { householdId: string; householdName: string };

const PARTS = ['Overdue', 'Morning', 'Afternoon', 'Evening', 'Any time'] as const;

function partOfDay(task: LabelledTask): (typeof PARTS)[number] {
  if (task.bucket === 'overdue' && !task.done) return 'Overdue';
  if (task.anyTime || !task.dueAt) return 'Any time';
  const hour = new Date(task.dueAt).getHours();
  return hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
}

/**
 * H02 — All households: today's tasks for me from every household I belong to, each labelled
 * with its household. Tapping one opens it in its own household. Shopping lists and inventory
 * stay separate.
 */
export default function AllHouseholdsScreen() {
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const [tasks, setTasks] = useState<LabelledTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const load = useCallback(
    () =>
      actions
        .loadAllHouseholdsToday()
        .then((loaded) => {
          setTasks(loaded);
          setError(null);
        })
        .catch((failure) => setError(errorMessage(failure))),
    [actions],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (task: LabelledTask) => {
    setOpening(task.id);
    try {
      if (task.householdId !== state.household.id) await actions.switchHousehold(task.householdId);
      router.replace('/home');
      router.push(`/task/${task.id}`);
    } catch (failure) {
      setError(errorMessage(failure));
      setOpening(null);
    }
  };

  const done = tasks?.filter((t) => t.done).length ?? 0;
  const count = state.myHouseholds.length;

  return (
    <Screen gap={16}>
      <View style={styles.header}>
        <BackButton fallback="/home" />
        <View style={styles.flex}>
          <Text weight="medium" size={13} muted>
            {formatLongDate(new Date())}
          </Text>
          <Text accessibilityRole="header" display size={26}>
            All households
          </Text>
        </View>
      </View>

      <Card padded style={styles.progress}>
        <Text weight="bold" size={16}>
          Hi! {me?.name}
        </Text>
        <Text size={13} muted>
          Today across {count} {count === 1 ? 'household' : 'households'}
          {tasks ? ` · ${done} of ${tasks.length} done` : ''}
        </Text>
        {tasks?.length ? (
          <View style={styles.bars}>
            {tasks.map((t) => (
              <View key={t.id} style={[styles.bar, t.done && styles.barDone]} />
            ))}
          </View>
        ) : null}
      </Card>

      {error ? (
        <Card padded>
          <Text size={14} color={Palette.danger}>
            {error}
          </Text>
          <Button label="Try again" variant="outline" size="sm" onPress={load} />
        </Card>
      ) : null}

      {tasks && tasks.length === 0 ? (
        <Card padded>
          <Text size={14} muted>
            Nothing due today in any of your households.
          </Text>
        </Card>
      ) : null}

      {tasks
        ? PARTS.map((part) => {
            const inPart = tasks.filter((t) => partOfDay(t) === part);
            if (!inPart.length) return null;
            return (
              <View key={part} style={styles.section}>
                <SectionLabel title={part} tone={part === 'Overdue' ? 'alert' : 'default'} />
                <Card divided>
                  {inPart.map((task) => (
                    <Pressable
                      key={task.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${task.title}, ${task.householdName}`}
                      disabled={!!opening}
                      onPress={() => open(task)}
                      style={({ pressed }) => [styles.row, pressed && { backgroundColor: Palette.muted }]}>
                      <View style={[styles.circle, task.done && styles.circleDone]}>
                        {task.done ? <Icon name="check" size={14} color={Palette.white} /> : null}
                      </View>
                      <View style={styles.flex}>
                        <Text weight="semibold" color={task.done ? Palette.slate : Palette.ink} style={task.done && styles.struck}>
                          {task.title}
                        </Text>
                        <View style={styles.meta}>
                          <View style={styles.label}>
                            <Text weight="bold" size={11}>
                              {shortHouseholdName(task.householdName)}
                            </Text>
                          </View>
                          <Text size={12} muted>
                            {opening === task.id
                              ? 'Opening…'
                              : [task.done ? `Done ${task.doneAt ?? ''}` : (task.wasDue ?? task.time ?? task.dueLabel), task.repeat]
                                  .filter(Boolean)
                                  .join(' · ')}
                          </Text>
                        </View>
                      </View>
                      <Icon name="chevron-right" size={16} color={Palette.slate} />
                    </Pressable>
                  ))}
                </Card>
              </View>
            );
          })
        : null}

      <Text size={12} muted style={styles.note}>
        Tap a task to open it in its household. Shopping lists and inventory stay separate — switch household to see
        them.
      </Text>
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
    gap: 12,
  },
  progress: {
    gap: 6,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.track,
  },
  barDone: {
    backgroundColor: Palette.ink,
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
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Palette.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  label: {
    backgroundColor: Palette.muted,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  note: {
    lineHeight: 17,
  },
});
