import { Tag } from '@/components/ui/card';
import { Palette } from '@/constants/theme';
import { roleTitle } from '@/state/selectors';
import type { Role } from '@/state/types';

const COLORS: Record<Role, { background: string; color: string }> = {
  admin: { background: Palette.coralTint, color: Palette.dangerDeep },
  member: { background: Palette.track, color: Palette.ink },
  child: { background: Palette.line, color: Palette.ink },
  staff: { background: Palette.slateTint, color: Palette.ink },
};

/** Supporting Admins get a quieter tag than the Primary Admin. */
const SUPPORTING = { background: Palette.slateTint, color: Palette.slateDeep };

export function RoleTag({ role, isPrimary }: { role: Role; isPrimary?: boolean }) {
  const colors = role === 'admin' && !isPrimary ? SUPPORTING : COLORS[role];
  return <Tag label={roleTitle({ role, isPrimary })} {...colors} />;
}
