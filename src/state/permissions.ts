import type { CalendarEvent, HouseholdState, Member, ShoppingItem, Task } from './types';

/**
 * Who can do what — the app's copy of the backend's rules (ule_backend/src/lib/permissions.ts),
 * used to show or hide buttons. The server always has the final say.
 *
 *   Admin  — everything.
 *   Member — own tasks and Staff's tasks; views and replies to events; sees prices; sends lists.
 *   Child  — own jobs; creates events; sends lists; no prices, household list or supplies.
 *   Staff  — own duties; views events; shopping list (prices only while shopping, or if allowed).
 */

const roleOf = (state: HouseholdState, id: string | null | undefined) => state.members.find((m) => m.id === id)?.role;

// ── Tasks ──
export const canCreateTasks = (me: Member) => me.role === 'admin' || me.role === 'member';

/** Who a person may pick as the assignee. */
export function assignableMembers(state: HouseholdState, me: Member) {
  if (me.role === 'admin') return state.members;
  if (me.role === 'member') return state.members.filter((m) => m.id === me.id || m.role === 'staff');
  return [];
}

export const canEditTask = (me: Member, task: Task) => me.role === 'admin' || (me.role === 'member' && task.createdBy === me.id);
export const canCompleteTask = (me: Member, task: Task) => task.assigneeId === me.id;
export const canNudge = (state: HouseholdState, me: Member, task: Task) =>
  (me.role === 'admin' || me.role === 'member') &&
  !!task.assigneeId &&
  task.assigneeId !== me.id &&
  (me.role === 'admin' || task.createdBy === me.id || roleOf(state, task.assigneeId) === 'staff');

// ── Calendar ──
export const canCreateEvents = (me: Member) => me.role === 'admin' || me.role === 'child';
export const canRespondToEvents = (me: Member) => me.role !== 'staff';
export const canEditEvent = (me: Member, event: CalendarEvent) => event.createdBy === me.id || me.role === 'admin';
export const myInvite = (me: Member, event: CalendarEvent) => event.invitees.find((i) => i.memberId === me.id);

// ── Shopping ──
export const isShopper = (state: HouseholdState, me: Member) => !!state.shopper.memberId && state.shopper.memberId === me.id;
/** Only Admins always see the household list; anyone else only while they're the assigned shopper. */
export const canViewShoppingList = (state: HouseholdState, me: Member) => me.role === 'admin' || isShopper(state, me);
export const canAddToShoppingList = (me: Member) => me.role === 'admin';
export const canSetPrices = (me: Member) => me.role === 'admin';
export const canSeeShoppingTotals = (me: Member) => me.role === 'admin';
export const canTickItems = (state: HouseholdState, me: Member) => me.role === 'admin' || isShopper(state, me);
/** Shoppers see prices and tick items, but only Admins change the list. */
export const canEditItem = (me: Member, _item?: ShoppingItem) => me.role === 'admin';
export const canFinishShopping = canTickItems;
export const canAssignShopper = (me: Member) => me.role === 'admin';
export const canSendRequests = (me: Member) =>
  me.role === 'member' || me.role === 'child' || (me.role === 'staff' && me.canSendRequests);
export const canReviewRequests = (me: Member) => me.role === 'admin';

// ── Inventory ──
export const canViewInventory = (me: Member) =>
  me.role === 'admin' || me.role === 'member' || (me.role === 'staff' && me.canUpdateSupplies);
export const canManageInventory = (me: Member) => me.role === 'admin';
