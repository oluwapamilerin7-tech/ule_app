import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/api/client';
import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { enterApp, enterOnboarding } from '@/lib/navigation';
import { useHousehold } from '@/state/household';

/**
 * P04 / H05 — leave a household. The Primary Admin never gets here (they can delete instead).
 * `?id=` is the household; leaving one doesn't affect the others.
 */
export default function LeaveHouseholdDialog() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useHousehold();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const household = state.myHouseholds.find((h) => h.id === (id ?? state.household.id));
  if (!household || household.isPrimary) return <NotFoundSheet what="Household" />;

  const others = state.myHouseholds.filter((h) => h.id !== household.id);
  const current = household.id === state.household.id;
  const what = household.role === 'staff' ? 'duties and shopping list' : 'tasks, calendar and shopping';
  const message =
    `You’ll lose access to its ${what} straight away. ` +
    (others.length === 1
      ? `${others[0]!.name} isn’t affected.`
      : others.length > 1
        ? 'Your other households aren’t affected.'
        : `The household keeps working${household.primaryAdminName ? `, with ${household.primaryAdminName} as Primary Admin` : ''}.`);

  const leave = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await actions.leaveHousehold(household.id);
      if (!current) router.back();
      else if (next === 'noHousehold') enterOnboarding();
      else enterApp();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  };

  return (
    <Dialog icon="logout" title={`Leave ${household.name}?`} message={message}>
      {error ? (
        <Text size={13} color={Palette.danger}>
          {error}
        </Text>
      ) : null}
      <Button label={busy ? 'Leaving…' : 'Leave household'} variant="danger" size="md" disabled={busy} onPress={leave} />
      <Button label="Cancel" variant="ghost" size="sm" onPress={() => router.back()} />
    </Dialog>
  );
}
