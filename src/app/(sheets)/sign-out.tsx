import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/sheet';
import { leaveApp } from '@/lib/navigation';
import { useHousehold } from '@/state/household';

/** S09 — sign out, warning about changes that haven't synced. */
export default function SignOutDialog() {
  const { state, actions } = useHousehold();
  const pending = state.sync.pending.length;

  const signOut = async () => {
    await actions.signOut();
    leaveApp();
  };

  return (
    <Dialog
      icon="logout"
      tone="neutral"
      title="Sign out of Ulé?"
      message={
        pending
          ? `${pending} ${pending === 1 ? "change hasn't" : "changes haven't"} synced yet. If you sign out now ${pending === 1 ? 'it' : 'they'} will be lost.`
          : "You'll need your username and password to sign back in."
      }>
      {pending ? <Button label="Sync first" size="md" onPress={() => router.replace('/sync')} /> : null}
      <Button
        label={pending ? 'Sign out anyway' : 'Sign out'}
        variant={pending ? 'danger-outline' : 'danger'}
        size="md"
        onPress={() => void signOut()}
      />
      <Button label="Cancel" variant="ghost" size="sm" onPress={() => router.back()} />
    </Dialog>
  );
}
