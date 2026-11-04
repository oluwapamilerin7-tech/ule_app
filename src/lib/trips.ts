import { formatShortDate } from './dates';
import { formatNaira } from './money';

/** "Sat 26 Sep 2026" */
export function tripDate(iso: string) {
  const date = new Date(iso);
  return `${formatShortDate(date)} ${date.getFullYear()}`;
}

/** "₦500 under" / "₦1,200 over" / "On estimate" — `difference` is estimate minus spent. */
export function differenceLabel(difference: number) {
  if (difference === 0) return 'On estimate';
  return `${formatNaira(Math.abs(difference))} ${difference > 0 ? 'under' : 'over'}`;
}
