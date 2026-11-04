import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';

/** Shown when a sheet's item was deleted or the link is stale. */
export function NotFoundSheet({ what }: { what: string }) {
  return (
    <Sheet>
      <SheetHeader title={`${what} not found`} />
      <Text size={15} muted>
        {`This ${what.toLowerCase()} may have been deleted by someone else in the household.`}
      </Text>
      <Button label="Close" variant="outline" onPress={() => router.back()} />
    </Sheet>
  );
}
