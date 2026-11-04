import type { RequestItem, RequestStatus, ShoppingRequest } from '@/state/types';

export const STATUS_TEXT: Record<RequestStatus, string> = {
  pending: 'Awaiting approval',
  approved: 'Approved. Added to the household list.',
  rejected: 'Not approved.',
  withdrawn: 'Withdrawn.',
};

/** "Garri, eggs, rice · 3 items" */
export function requestSummary(request: ShoppingRequest) {
  const names = request.items.slice(0, 3).map((i, index) => (index === 0 ? i.name : i.name.toLowerCase()));
  const more = request.items.length > 3 ? '…' : '';
  return `${names.join(', ')}${more} · ${request.items.length} ${request.items.length === 1 ? 'item' : 'items'}`;
}

/** "1 box · Breakfast" */
export function requestItemLabel(item: Pick<RequestItem, 'qty' | 'unit' | 'category'>) {
  return [`${item.qty}${item.unit ? ` ${item.unit}` : ''}`, item.category].filter(Boolean).join(' · ');
}

/** "Garri and eggs" / "Cornflakes, milk (tin) and 3 more" */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names.join('');
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}
