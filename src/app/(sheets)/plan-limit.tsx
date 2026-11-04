import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/button';
import type { IconName } from '@/components/ui/icon';
import { Dialog } from '@/components/ui/sheet';

type Kind = 'household_full' | 'one_household' | 'admin_limit' | 'supporting_admin_taken';

const COPY: Record<Kind, { icon: IconName; title: string; message: string }> = {
  // P01
  household_full: {
    icon: 'user-plus',
    title: 'Your household has reached its limit',
    message:
      'This household has reached its 5-person limit on the Free Plan. You can continue managing your current household, but adding another person isn’t available at the moment.',
  },
  // P02
  one_household: {
    icon: 'home',
    title: 'One household at a time',
    message:
      'You’re all set with your current household! Creating and managing multiple households isn’t available in Ulé just yet.\n\nFor now, you can manage one household as an Admin and still join other households as a Member, Staff, or Child. We’re working on bringing more flexibility to your household management experience.',
  },
  // H10 — joining someone else's household as its Supporting Admin
  admin_limit: {
    icon: 'lock',
    title: 'You can’t join as Supporting Admin',
    message: 'You already help run a household, and you can run one household at a time.',
  },
  supporting_admin_taken: {
    icon: 'users',
    title: 'There’s already a Supporting Admin',
    message: 'A household can have one Supporting Admin. Add this person as a Member, Staff or Child instead.',
  },
};

const ASK_INSTEAD =
  'Ask them to invite you as a Member, Staff or Child instead. You’ll still see the tasks and events they share with you.';

/**
 * Free Plan and admin-role limits (P01, P02, H10). `?message=` is the server's own explanation,
 * which names the household or person.
 */
export default function PlanLimitDialog() {
  const { kind = 'household_full', message } = useLocalSearchParams<{ kind?: Kind; message?: string }>();
  const copy = COPY[kind] ?? COPY.household_full;
  const text = message ?? copy.message;

  return (
    <Dialog icon={copy.icon} tone="neutral" title={copy.title} message={kind === 'admin_limit' ? `${text}\n\n${ASK_INSTEAD}` : text}>
      <Button label="Got it" size="md" onPress={() => router.back()} />
    </Dialog>
  );
}
