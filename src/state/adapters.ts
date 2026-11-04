import type {
  ApiEvent,
  ApiEventReminder,
  ApiHousehold,
  ApiInventoryItem,
  ApiInvite,
  ApiMember,
  ApiMembershipSummary,
  ApiNotification,
  ApiPreferences,
  ApiReminder,
  ApiShoppingGroup,
  ApiShoppingItem,
  ApiShoppingRequest,
  ApiStore,
  ApiTask,
  ApiTaskActivity,
  ApiUser,
} from '@/api/types';
import { Palette } from '@/constants/theme';
import { dayDiff, format24hShort, formatClock, formatShortDate, isSameDay, weekdayShort } from '@/lib/dates';

import { avatarColors } from './demo-data';
import type {
  AppNotification,
  CalendarEvent,
  HistoryEntry,
  InventoryItem,
  Invite,
  Member,
  MyHousehold,
  Preferences,
  ShoppingGroup,
  ShoppingItem,
  ShoppingRequest,
  Store,
  Task,
} from './types';

// ── Labels shared with the forms ────────────────────────────────────────────────────

export const TASK_REMINDERS: { code: ApiReminder | null; label: string }[] = [
  { code: 'day_before_6pm', label: '1 day before, 6pm' },
  { code: 'morning_of', label: 'Morning of' },
  { code: 'hour_before', label: '1 hour before' },
  { code: null, label: 'No reminder' },
];

export const EVENT_REMINDERS: { code: ApiEventReminder; label: string }[] = [
  { code: 'hour_before', label: '1 hour before' },
  { code: 'day_before_7pm', label: 'Day before, 7pm' },
  { code: 'morning_of', label: 'Morning of' },
];

const STORES: Record<ApiStore, Store> = { market: 'Market', supermarket: 'Supermarket', other: 'Other' };
export const storeCode = (store: Store): ApiStore => store.toLowerCase() as ApiStore;

const TIMEZONES: Record<string, { long: string; short: string }> = {
  'Africa/Lagos': { long: 'West Africa Time (Lagos)', short: 'WAT (Lagos)' },
};

export function timezoneLabels(zone: string) {
  return TIMEZONES[zone] ?? { long: zone, short: zone };
}

/** "06:30" (server) ↔ "6:30am" (app). */
export const toDisplayTime = (hhmm: string) => format24hShort(hhmm).replace(/^(\d+)(am|pm)$/, '$1:00$2');
export function toServerTime(display: string) {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(display.trim());
  if (!match) return display;
  let hours = Number(match[1]) % 12;
  if (match[3]!.toLowerCase() === 'pm') hours += 12;
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

// ── Converters ──────────────────────────────────────────────────────────────────────

export function toMember(member: ApiMember, index: number, user?: ApiUser, isMe = false): Member {
  return {
    id: member.id,
    name: member.displayName,
    fullName: isMe ? user?.fullName : undefined,
    username: isMe ? user?.username : undefined,
    email: isMe ? (user?.email ?? undefined) : undefined,
    initials: member.initials,
    role: member.role,
    isPrimary: member.isPrimary,
    ...avatarColors(index),
    joined: formatShortDate(new Date(member.joinedAt)).replace(/^\w+ /, ''),
    canUpdateSupplies: member.canUpdateSupplies,
    canSendRequests: member.canSendRequests,
    canSeePrices: member.canSeePrices,
  };
}

export function toInvite(invite: ApiInvite): Invite {
  const sentDays = dayDiff(new Date(invite.lastSentAt), new Date());
  return {
    id: invite.id,
    name: invite.name,
    role: invite.role,
    code: invite.code,
    link: invite.link,
    sentLabel: sentDays <= 0 ? 'sent just now' : `sent ${sentDays} ${sentDays === 1 ? 'day' : 'days'} ago`,
    expiresInDays: Math.max(0, dayDiff(new Date(), new Date(invite.expiresAt))),
    channel: invite.channel ?? undefined,
  };
}

const VISIBILITY: Record<ApiTask['visibility'], string> = {
  adults: 'Adults',
  adults_and_assignee: 'Adults and the assignee',
  everyone: 'Everyone',
};

export function toTask(task: ApiTask): Task {
  const now = new Date();
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const bucket = task.bucket === 'someday' ? 'later' : task.bucket;
  const time = due && !task.anyTime ? formatClock(due) : undefined;

  let dueLabel: string | undefined;
  if (due && bucket === 'overdue') {
    const late = dayDiff(due, now);
    dueLabel = late <= 1 ? 'Due yesterday' : `${late} days late`;
  } else if (due && bucket === 'week') {
    dueLabel = `${weekdayShort(due)}${time ? `, ${time}` : ''}`;
  } else if (due && bucket === 'later') {
    dueLabel = formatShortDate(due);
  } else if (!due) {
    dueLabel = 'Someday';
  }

  return {
    id: task.id,
    title: task.title,
    assigneeId: task.assigneeId,
    createdBy: task.createdById ?? '',
    bucket,
    dueAt: task.dueAt,
    anyTime: task.anyTime,
    time: bucket === 'today' ? (time ?? 'Any time') : time,
    dueLabel,
    wasDue: due && bucket === 'overdue' ? `${formatShortDate(due)}${time ? `, ${time}` : ''}` : undefined,
    repeat: task.repeat?.label,
    repeatRule: task.repeat,
    context: task.linkedInventoryId ? 'from Supplies' : undefined,
    notes: task.notes ?? undefined,
    reminder: TASK_REMINDERS.find((r) => r.code === task.reminder)?.label,
    reminderCode: task.reminder,
    tellIfMissed: task.tellIfMissed,
    visibleTo: VISIBILITY[task.visibility],
    done: task.done,
    notYet: !!task.repeat && !task.done && (bucket === 'week' || bucket === 'later'),
    doneAt: task.completedAt ? formatClock(new Date(task.completedAt)) : undefined,
    doneById: task.completedById ?? undefined,
    linkedInventoryId: task.linkedInventoryId ?? undefined,
    seriesId: task.seriesId ?? undefined,
    history: [],
    version: task.version,
  };
}

const ACTIVITY_LABELS: Record<ApiTaskActivity['kind'], { verb: string; tone: HistoryEntry['tone'] }> = {
  created: { verb: 'Created by', tone: 'grey' },
  updated: { verb: 'Edited by', tone: 'grey' },
  completed: { verb: 'Completed by', tone: 'slate' },
  reopened: { verb: 'Reopened by', tone: 'grey' },
  reassigned: { verb: 'Reassigned by', tone: 'grey' },
  nudged: { verb: 'Nudged by', tone: 'coral' },
  reminder_sent: { verb: 'Reminder sent', tone: 'coral' },
  skipped: { verb: 'Skipped by', tone: 'grey' },
};

export function toHistory(entries: ApiTaskActivity[]): HistoryEntry[] {
  return entries.map((entry) => {
    const spec = ACTIVITY_LABELS[entry.kind];
    const at = new Date(entry.createdAt);
    return {
      label: entry.kind === 'reminder_sent' ? spec.verb : `${spec.verb} ${entry.actorName ?? 'someone'}`,
      when: isSameDay(at, new Date()) ? formatClock(at) : formatShortDate(at).replace(/^\w+ /, ''),
      tone: spec.tone,
    };
  });
}

const EVENT_ACCENTS = [Palette.slate, Palette.ink, Palette.coral];

export function toEvent(event: ApiEvent, index: number): CalendarEvent {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  return {
    id: event.id,
    key: `${event.id}@${event.startsAt}`,
    title: event.title,
    dayOffset: dayDiff(new Date(), start),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    start: event.allDay ? undefined : formatClock(start),
    end: end && !event.allDay ? formatClock(end) : undefined,
    allDay: event.allDay,
    place: event.place ?? undefined,
    subtitle: [event.place, event.notes].filter(Boolean).join(' · ') || undefined,
    notes: event.notes ?? undefined,
    category: event.category ?? undefined,
    kind: event.kind,
    accent: event.kind === 'holiday' ? Palette.grey : EVENT_ACCENTS[index % EVENT_ACCENTS.length]!,
    repeat: event.repeat?.label,
    repeatRule: event.repeat,
    reminders: event.reminders.map((code) => EVENT_REMINDERS.find((r) => r.code === code)?.label ?? code),
    reminderCodes: event.reminders,
    createdBy: event.createdById ?? undefined,
    invitees: event.invitees,
    version: event.version,
  };
}

export function toShoppingItem(item: ApiShoppingItem): ShoppingItem {
  return {
    id: item.id,
    name: item.name,
    qty: item.qty,
    unit: item.unit,
    unitPrice: item.unitPrice ?? undefined,
    priceHidden: item.priceHidden,
    store: STORES[item.store],
    addedBy: item.addedById ?? undefined,
    fromLowStock: item.fromLowStock,
    requestId: item.requestId ?? undefined,
    boughtQty: item.boughtQty,
    inBasket: item.inBasket,
    pendingSync: false,
    buyerId: item.buyerId ?? undefined,
    version: item.version,
  };
}

export function toInventoryItem(item: ApiInventoryItem): InventoryItem {
  const amount = item.quantity != null ? `${item.quantity} ${item.unit ?? ''}`.trim() : null;
  return {
    id: item.id,
    name: item.name,
    qty: [amount, item.note].filter(Boolean).join(' · ') || '—',
    group: item.group,
    status: item.status,
    updatedBy: item.updatedById ?? undefined,
    updatedAt: formatClock(new Date(item.updatedAt)),
    onList: item.onList,
    autoAddWhenLow: item.autoAddWhenLow,
    restockQty: item.restockQty,
    restockUnit: item.restockUnit,
    quantity: item.quantity,
    unit: item.unit ?? undefined,
    price: item.price ?? undefined,
    pricePer: item.pricePer ?? undefined,
    priceHidden: item.priceHidden,
    version: item.version,
  };
}

/** "today at 9:30am" / "Thu at 9:30am" */
function sentLabel(iso: string) {
  const at = new Date(iso);
  return `${isSameDay(at, new Date()) ? 'today' : weekdayShort(at)} at ${formatClock(at)}`;
}

export function toShoppingGroup(group: ApiShoppingGroup): ShoppingGroup {
  return {
    id: group.id,
    requesterId: group.requesterId ?? undefined,
    reviewedById: group.reviewedById ?? undefined,
    reviewedAt: group.reviewedAt ? formatClock(new Date(group.reviewedAt)) : undefined,
  };
}

export function toRequest(request: ApiShoppingRequest): ShoppingRequest {
  return {
    id: request.id,
    status: request.status,
    requesterId: request.requesterId ?? undefined,
    requesterName: request.requesterName ?? 'Someone',
    reviewedByName: request.reviewedByName ?? undefined,
    sentLabel: sentLabel(request.createdAt),
    reviewedLabel: request.reviewedAt ? sentLabel(request.reviewedAt) : undefined,
    items: request.items.map((i) => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      unit: i.unit ?? undefined,
      category: i.category ?? undefined,
      inventoryItemId: i.inventoryItemId ?? undefined,
      unitPrice: i.unitPrice ?? undefined,
      added: i.added,
      alreadyOnList: i.alreadyOnList,
    })),
  };
}

export function toNotification(n: ApiNotification): AppNotification {
  const at = new Date(n.createdAt);
  return {
    id: n.id,
    kind: n.kind,
    body: n.body,
    when: isSameDay(at, new Date()) ? formatClock(at).replace(/(am|pm)$/, '') : weekdayShort(at),
    unread: n.unread,
    action: n.action ?? undefined,
  };
}

export function toPreferences(p: ApiPreferences, local: Pick<Preferences, 'keepSignedIn' | 'lowDataMode'>): Preferences {
  return { ...p, dailySummaryAt: toDisplayTime(p.dailySummaryAt), ...local };
}

export function toMyHousehold(h: ApiMembershipSummary): MyHousehold {
  return {
    id: h.id,
    name: h.name,
    city: h.city,
    role: h.role,
    isPrimary: h.isPrimary,
    joined: formatShortDate(new Date(h.joinedAt)),
    primaryAdminName: h.primaryAdminName ?? undefined,
    overdue: h.overdue,
    toReview: h.toReview,
  };
}

export function toHousehold(h: ApiHousehold) {
  const tz = timezoneLabels(h.timezone);
  return { id: h.id, name: h.name, timezone: tz.long, timezoneShort: tz.short, budget: h.budget };
}
