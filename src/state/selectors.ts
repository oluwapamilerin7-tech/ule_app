import type { HouseholdState, Member, MyHousehold, Role, ShoppingItem, Task } from './types';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  member: 'Member',
  child: 'Child',
  staff: 'Staff',
};

/** What each role sees, used by the invite flows and the role sheet. */
export const ROLE_ACCESS: Record<Role, { summary: string; sees: string; hidden: string }> = {
  admin: {
    summary: 'Everything, including roles and settings',
    sees: 'Everything · Roles · Settings',
    hidden: 'Nothing is hidden',
  },
  member: {
    summary: 'Own tasks and staff tasks, events shared with them, supplies, shopping lists for approval',
    sees: 'Own tasks and staff tasks · Events shared with them · Supplies with prices · The shopping list when they shop',
    hidden: "Other adults' tasks · Events not shared with them · The household list unless they're shopping · Budget",
  },
  child: {
    summary: 'Own jobs, events shared with them, and a shopping list for approval',
    sees: 'Own jobs · Events shared with them · Their own shopping requests · The shopping list when they shop',
    hidden: "Others' tasks · Events not shared with them · The household list unless they're shopping · Inventory",
  },
  staff: {
    summary: 'Own duties, events shared with them, and the shopping list when they shop',
    sees: 'Own duties · Events shared with them · The shopping list and its prices when they shop',
    hidden: "Others' tasks · Events not shared with them · The household list unless they're shopping · Inventory prices",
  },
};

/** "Primary Admin" or "Supporting Admin" for admins; the plain role for everyone else. */
export function roleTitle(person: { role: Role; isPrimary?: boolean }) {
  if (person.role !== 'admin') return ROLE_LABELS[person.role];
  return person.isPrimary ? 'Primary Admin' : 'Supporting Admin';
}

/** M14: what choosing Supporting Admin means. */
export const SUPPORTING_ADMIN_SUMMARY =
  'Helps run the household: people, roles and settings. Optional. It counts as running a household, so it’s not available to someone who already runs another one.';

export function primaryAdmin(state: HouseholdState) {
  return state.members.find((m) => m.role === 'admin' && m.isPrimary);
}

/** The household's one Supporting Admin, if it has one. */
export function supportingAdmin(state: HouseholdState) {
  return state.members.find((m) => m.role === 'admin' && !m.isPrimary);
}

/** Free Plan: 5 people, pending invites included. */
export function householdFull(state: HouseholdState) {
  return state.plan.people >= state.plan.peopleLimit;
}

/** Free Individual: already runs as many households as allowed (1). */
export function runsMaxHouseholds(state: HouseholdState) {
  return state.administering.count >= state.administering.limit;
}

/** The small line under a household's name in the switcher: who runs it, or where it is. */
export function householdNote(h: MyHousehold) {
  if (h.isPrimary) return 'You created it';
  if (h.role === 'admin') return h.primaryAdminName ? `${h.primaryAdminName} is Primary Admin` : 'You help run it';
  return h.city || (h.primaryAdminName ? `${h.primaryAdminName}’s household` : '');
}

/** "The Okafor Household" → "Okafor", for the labels on the All households list. */
export function shortHouseholdName(name: string) {
  return name.replace(/^the\s+/i, '').replace(/\s+household$/i, '').trim() || name;
}

export function currentUser(state: HouseholdState): Member {
  return state.members.find((m) => m.id === state.currentUserId) ?? state.members[0];
}

export function memberById(state: HouseholdState, id: string | null | undefined) {
  return id ? state.members.find((m) => m.id === id) : undefined;
}

export function isAdmin(state: HouseholdState) {
  return currentUser(state)?.role === 'admin';
}

export type TaskScope = 'mine' | 'household';

export function tasksInScope(state: HouseholdState, scope: TaskScope) {
  return scope === 'mine' ? state.tasks.filter((t) => t.assigneeId === state.currentUserId) : state.tasks;
}

export function tasksFor(state: HouseholdState, memberId: string) {
  return state.tasks.filter((t) => t.assigneeId === memberId);
}

/**
 * Who hears about an edit or delete of someone else's task:
 * "Deborah (creator) and Grace (assignee) will be notified." Null when it's all your own.
 */
export function taskChangeNotice(state: HouseholdState, task: Task) {
  const me = state.currentUserId;
  const creator = memberById(state, task.createdBy);
  const assignee = memberById(state, task.assigneeId);
  const people: string[] = [];
  if (creator && creator.id !== me) people.push(`${creator.name} (creator)`);
  if (assignee && assignee.id !== me && assignee.id !== creator?.id) people.push(`${assignee.name} (assignee)`);
  if (people.length === 0) return null;
  const others = creator && creator.id !== me;
  const origin = others
    ? `${creator.name} created this task${assignee && assignee.id !== creator.id ? ` and assigned it to ${assignee.id === me ? 'you' : assignee.name}` : ''}.`
    : null;
  return { origin, notice: `${people.join(' and ')} will be notified.` };
}

export function openOverdue(tasks: Task[]) {
  return tasks.filter((t) => t.bucket === 'overdue' && !t.done);
}

export function openToday(tasks: Task[]) {
  return tasks.filter((t) => t.bucket === 'today' && !t.done);
}

export function lineTotal(item: ShoppingItem) {
  return item.unitPrice != null ? item.unitPrice * item.qty : 0;
}

/** "2 litres × ₦3,000" style amount line, without the price formatting. */
export function quantityLabel(item: ShoppingItem) {
  return `${item.qty} ${item.unit}`;
}

export function shoppingTotals(state: HouseholdState) {
  const total = state.shopping.reduce((sum, item) => sum + lineTotal(item), 0);
  const inBasket = state.shopping
    .filter((item) => item.inBasket)
    .reduce((sum, item) => sum + lineTotal(item), 0);
  const unpriced = state.shopping.filter((item) => item.unitPrice == null).length;
  return {
    count: state.shopping.length,
    total,
    inBasket,
    leftToBuy: total - inBasket,
    basketCount: state.shopping.filter((item) => item.inBasket).length,
    unpriced,
    budgetLeft: state.household.budget - total,
  };
}

export function stockCounts(state: HouseholdState) {
  return {
    all: state.inventory.length,
    low: state.inventory.filter((i) => i.status === 'low').length,
    out: state.inventory.filter((i) => i.status === 'out').length,
  };
}

export function unreadCount(state: HouseholdState) {
  return state.notifications.filter((n) => n.unread).length;
}
