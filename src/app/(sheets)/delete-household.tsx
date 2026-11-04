import { router } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';

/**
 * S11 — the Primary Admin can't leave the household they created, but can ask for it to be
 * deleted. The Ulé team completes the request within 30 days, under the deletion policy.
 */
export default function DeleteHouseholdDialog() {
  const { state, actions } = useHousehold();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = state.household.name;

  const ask = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.requestHouseholdDeletion();
      setSent(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Dialog
        icon="check"
        tone="neutral"
        title="Request sent"
        message={`We’ll delete ${name} and everything in it within 30 days. Until then, the household keeps working as normal.`}>
        <Button label="Got it" size="md" onPress={() => router.back()} />
      </Dialog>
    );
  }

  return (
    <Dialog
      icon="trash"
      title={`Delete ${name}?`}
      message={`Its tasks, events, shopping lists, supplies and history will be deleted for everyone in it. People keep their Ulé accounts and any other households they belong to. Ulé completes the deletion within 30 days.`}>
      {error ? (
        <Text size={13} color={Palette.danger}>
          {error}
        </Text>
      ) : null}
      <Button label={busy ? 'Sending…' : 'Delete household'} variant="danger" size="md" disabled={busy} onPress={ask} />
      <Button label="Cancel" variant="ghost" size="sm" onPress={() => router.back()} />
    </Dialog>
  );
}
