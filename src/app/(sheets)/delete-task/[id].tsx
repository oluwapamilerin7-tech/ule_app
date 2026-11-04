import { router, useLocalSearchParams } from 'expo-router';

import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/sheet';
import { useHousehold } from '@/state/household';
import { taskChangeNotice } from '@/state/selectors';

/** M04 — delete a (possibly recurring) task. Opened from the task detail sheet. */
export default function DeleteTaskDialog() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return <NotFoundSheet what="Task" />;

  const remove = (scope: 'one' | 'all') => {
    // "Only this one" on a recurring task skips it; the next occurrence is still scheduled.
    void actions.deleteTask(task.id, task.repeat ? scope : 'all');
    // Close this dialog and the detail sheet underneath it.
    router.dismiss(2);
  };

  const change = taskChangeNotice(state, task);
  const message = [
    change?.origin,
    task.repeat
      ? `This task repeats ${task.repeat.toLowerCase()}. Its history stays in the activity log.`
      : 'Its history stays in the activity log.',
    change?.notice,
  ]
    .filter(Boolean)
    .join('\n\n');

  return (
    <Dialog icon="trash" title={`Delete '${task.title.replace(/\s*\(.*\)$/, '')}'?`} message={message}>
      {task.repeat ? (
        <>
          <Button label="Only this one" variant="subtle" size="md" onPress={() => remove('one')} />
          <Button label="This and all future ones" variant="danger" size="md" onPress={() => remove('all')} />
        </>
      ) : (
        <Button label="Delete task" variant="danger" size="md" onPress={() => remove('all')} />
      )}
      <Button label="Cancel" variant="ghost" size="sm" onPress={() => router.back()} />
    </Dialog>
  );
}
