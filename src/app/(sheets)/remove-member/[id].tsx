import { router, useLocalSearchParams } from 'expo-router';

import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/sheet';
import { useHousehold } from '@/state/household';
import { currentUser, primaryAdmin, tasksFor } from '@/state/selectors';

/** M15 — remove a member. `?via=sheet` when opened on top of the member sheet. */
export default function RemoveMemberDialog() {
  const { id, via } = useLocalSearchParams<{ id: string; via?: string }>();
  const { state, actions } = useHousehold();
  const member = state.members.find((m) => m.id === id);
  if (!member) return <NotFoundSheet what="Member" />;

  const recurring = tasksFor(state, member.id).filter((t) => t.repeat).length;
  const close = () => (via === 'sheet' ? router.dismiss(2) : router.back());
  const primary = primaryAdmin(state);
  const me = currentUser(state);

  return (
    <Dialog
      icon="user-minus"
      title={`Remove ${member.name} from the household?`}
      message={
        `${member.name} will lose access straight away.` +
        // P03: removing the Supporting Admin — the household keeps working without one.
        (member.role === 'admin'
          ? ` ${state.household.name} keeps working — ${primary?.id === me?.id ? 'you’re' : `${primary?.name ?? 'the Primary Admin'} is`} still the Primary Admin, and a Supporting Admin is optional.`
          : '') +
        (recurring
          ? ` Their ${recurring} recurring ${recurring === 1 ? 'duty' : 'duties'} will be unassigned — you can give them to someone else next.`
          : '')
      }>
      <Button
        label={`Remove ${member.name}`}
        variant="danger"
        size="md"
        onPress={() => {
          actions.removeMember(member.id);
          close();
        }}
      />
      <Button label="Cancel" variant="ghost" size="sm" onPress={() => router.back()} />
    </Dialog>
  );
}
