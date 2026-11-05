import { createContext, use, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';

import { ApiError, auth, isNetworkError } from '@/api/client';
import {
  Api,
  type EventInput,
  type InventoryInput,
  type RequestItemInput,
  type ShoppingInput,
  type TaskInput,
} from '@/api/endpoints';
import type { ApiRole, ApiUser } from '@/api/types';
import { addDays, formatClock } from '@/lib/dates';

import {
  toEvent,
  toHistory,
  toHousehold,
  toInventoryItem,
  toInvite,
  toMember,
  toMyHousehold,
  toNotification,
  toPreferences,
  toRequest,
  toServerTime,
  toShoppingGroup,
  toShoppingItem,
  toTask,
} from './adapters';
import { EMPTY_DRAFT, emptyState } from './demo-data';
import type { Draft, HouseholdState, Invite, Member, PendingChange, Preferences, Segment, StockStatus } from './types';

/**
 * Household data from the Ulé API, kept in one store that every screen reads.
 *
 * Actions call the API and then re-fetch what changed. Quick toggles update the screen first
 * so the app feels instant. When the server can't be reached, changes wait in an outbox and
 * the app shows it's offline; they're sent again on "Try syncing now" or automatically.
 * If someone else edited the same item first, the change becomes a conflict the person can
 * resolve with "Keep mine" / "Keep theirs".
 */

export type Status =
  /** Checking for a saved sign-in on launch. */
  | 'restoring'
  | 'signedOut'
  /** Signed in but not in a household yet (just signed up). */
  | 'noHousehold'
  | 'ready'
  /** Signed in, but the server couldn't be reached on launch. */
  | 'unreachable';

type Snapshot = { state: HouseholdState; status: Status };

/** Exported for integration scripts; screens use `useHousehold()`. */
export function createStore() {
  let snapshot: Snapshot = { state: emptyState(), status: 'restoring' };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    get: () => snapshot,
    setStatus(status: Status) {
      snapshot = { ...snapshot, status };
      emit();
    },
    update(fn: (state: HouseholdState) => HouseholdState) {
      snapshot = { ...snapshot, state: fn(snapshot.state) };
      emit();
    },
    reset(status: Status) {
      snapshot = { state: emptyState(), status };
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

type Slice =
  /** The households I belong to (switcher, My households). */
  | 'households'
  | 'household'
  | 'invites'
  | 'tasks'
  | 'events'
  | 'shopping'
  | 'requests'
  | 'inventory'
  | 'notifications'
  | 'preferences';
const ALL_SLICES: Slice[] = [
  'households',
  'household',
  'invites',
  'tasks',
  'events',
  'shopping',
  'requests',
  'inventory',
  'notifications',
  'preferences',
];

type Queued = {
  change: PendingChange;
  run: () => Promise<unknown>;
  /** Re-sends the change on top of the latest server copy ("Keep mine"). */
  keepMine?: () => Promise<unknown>;
  refresh: Slice[];
};

/** 403s mean "your role can't see this" — treat as an empty list rather than an error. */
function emptyIfForbidden<T>(fallback: T) {
  return (error: unknown) => {
    if (error instanceof ApiError && error.status === 403) return fallback;
    throw error;
  };
}

/** Stable accent colour per event, so colours don't jump around as the list changes. */
function accentIndex(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash + char.charCodeAt(0)) % 997;
  return hash;
}

export function createActions(store: ReturnType<typeof createStore>) {
  let householdId: string | null = null;
  let user: ApiUser | null = null;
  const outbox = new Map<string, Queued>();
  let sequence = 0;

  const state = () => store.get().state;
  const hid = () => {
    if (!householdId) throw new Error('No household selected');
    return householdId;
  };

  // ── Loading ─────────────────────────────────────────────────────────────────────

  async function fetchSlice(slice: Slice): Promise<(s: HouseholdState) => HouseholdState> {
    const id = hid();
    switch (slice) {
      case 'households': {
        const me = await Api.me();
        user = me.user;
        return (s) => ({ ...s, myHouseholds: me.households.map(toMyHousehold), administering: me.administering });
      }
      case 'household': {
        const { household, me, members, plan } = await Api.household(id);
        return (s) => ({
          ...s,
          household: toHousehold(household),
          plan: { people: plan.people, peopleLimit: plan.peopleLimit },
          currentUserId: me.id,
          hasPassword: user?.hasPassword ?? true,
          members: members.map((m, i) => toMember(m, i, user ?? undefined, m.id === me.id)),
          shopper: { memberId: household.shopper.memberId ?? '', when: household.shopper.when },
        });
      }
      case 'invites': {
        const { invites } = await Api.invites(id).catch(emptyIfForbidden({ invites: [] }));
        return (s) => ({ ...s, invites: invites.map(toInvite) });
      }
      case 'tasks': {
        const { tasks } = await Api.tasks(id);
        return (s) => ({
          ...s,
          // A recurring task's next round stays out of sight until its week arrives.
          // Keep any history already loaded for the detail sheet.
          tasks: tasks
            .filter((t) => !(t.repeat && t.bucket === 'later'))
            .map((t) => ({ ...toTask(t), history: s.tasks.find((old) => old.id === t.id)?.history ?? [] })),
        });
      }
      case 'events': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { events } = await Api.events(id, addDays(today, -7).toISOString(), addDays(today, 31).toISOString()).catch(
          emptyIfForbidden({ events: [] }),
        );
        return (s) => ({ ...s, events: events.map((e) => toEvent(e, accentIndex(e.id))) });
      }
      case 'shopping': {
        const { items, requests } = await Api.shopping(id).catch(emptyIfForbidden({ items: [], requests: [] }));
        return (s) => ({ ...s, shopping: items.map(toShoppingItem), shoppingGroups: requests.map(toShoppingGroup) });
      }
      case 'requests': {
        const { requests } = await Api.requests(id);
        return (s) => ({ ...s, requests: requests.map(toRequest) });
      }
      case 'inventory': {
        const { items } = await Api.inventory(id).catch(emptyIfForbidden({ items: [] }));
        return (s) => ({ ...s, inventory: items.map(toInventoryItem) });
      }
      case 'notifications': {
        const { notifications } = await Api.notifications(id);
        return (s) => ({ ...s, notifications: notifications.map(toNotification) });
      }
      case 'preferences': {
        const { preferences } = await Api.preferences(id);
        return (s) => ({
          ...s,
          preferences: toPreferences(preferences, {
            keepSignedIn: s.preferences.keepSignedIn,
            lowDataMode: s.preferences.lowDataMode,
          }),
        });
      }
    }
  }

  async function refresh(slices: Slice[] = ALL_SLICES) {
    if (!householdId || slices.length === 0) return;
    const patches = await Promise.all([...new Set(slices)].map(fetchSlice));
    store.update((s) => patches.reduce((acc, patch) => patch(acc), s));
    markOnline();
  }

  function markOnline() {
    store.update((s) => ({ ...s, sync: { ...s.sync, online: true, lastSynced: formatClock(new Date()) } }));
  }

  function publishOutbox(online?: boolean) {
    store.update((s) => ({
      ...s,
      sync: {
        ...s.sync,
        online: online ?? s.sync.online,
        pending: [...outbox.values()].map((q) => q.change),
      },
    }));
  }

  function enqueue(item: Omit<Queued, 'change'> & { body: Segment[]; conflict?: PendingChange['conflict'] }) {
    sequence += 1;
    const id = `change-${sequence}`;
    outbox.set(id, {
      run: item.run,
      keepMine: item.keepMine,
      refresh: item.refresh,
      change: { id, body: item.body, when: formatClock(new Date()), conflict: item.conflict },
    });
  }

  /**
   * Runs a change against the server.
   * - `optimistic` updates the screen immediately.
   * - Offline → queued for later. 409 → becomes a conflict when `keepMine` is given.
   * - Anything else → the screen is re-synced with the server and the person is told.
   */
  async function mutate(options: {
    label: Segment[];
    run: () => Promise<unknown>;
    refresh: Slice[];
    optimistic?: (s: HouseholdState) => HouseholdState;
    keepMine?: () => Promise<unknown>;
    itemName?: string;
  }) {
    if (options.optimistic) store.update(options.optimistic);
    try {
      await options.run();
      await refresh(options.refresh);
    } catch (error) {
      await handleFailure(error, options);
    }
  }

  async function handleFailure(
    error: unknown,
    options: { label: Segment[]; run: () => Promise<unknown>; refresh: Slice[]; keepMine?: () => Promise<unknown>; itemName?: string },
  ) {
    if (isNetworkError(error)) {
      enqueue({ body: options.label, run: options.run, keepMine: options.keepMine, refresh: options.refresh });
      publishOutbox(false);
      return;
    }
    await refresh(options.refresh).catch(() => {});
    if (error instanceof ApiError && error.status === 409 && options.keepMine) {
      enqueue({
        body: [
          { text: options.itemName ?? 'This item', bold: true },
          { text: ' was also changed by someone else. Keep yours?' },
        ],
        conflict: { itemName: options.itemName ?? 'This item', otherMemberId: '' },
        run: options.keepMine,
        keepMine: options.keepMine,
        refresh: options.refresh,
      });
      publishOutbox();
      return;
    }
    if (error instanceof ApiError && error.status !== 401) Alert.alert("Couldn't save that", error.message);
  }

  /** Sends queued changes in order; stops at the first network failure. */
  async function syncNow() {
    for (const [id, item] of [...outbox]) {
      if (item.change.conflict) continue;
      try {
        await item.run();
        outbox.delete(id);
      } catch (error) {
        if (isNetworkError(error)) {
          publishOutbox(false);
          return;
        }
        outbox.delete(id);
        await handleFailure(error, { label: item.change.body, ...item });
      }
    }
    publishOutbox();
    try {
      await refresh();
    } catch (error) {
      if (isNetworkError(error)) publishOutbox(false);
    }
  }

  // ── Sessions ────────────────────────────────────────────────────────────────────

  /** After any sign-in: pick a household (the last one used, else the first) and load it. */
  async function enter(preferredHouseholdId?: string | null) {
    const me = await Api.me();
    user = me.user;
    const chosen = me.households.find((h) => h.id === preferredHouseholdId) ?? me.households[0];
    if (!chosen) {
      householdId = null;
      store.reset('noHousehold');
      return 'noHousehold' as const;
    }
    householdId = chosen.id;
    await auth.setHousehold(chosen.id);
    store.update((s) => ({ ...s, myHouseholds: me.households.map(toMyHousehold), administering: me.administering }));
    await refresh(ALL_SLICES.filter((slice) => slice !== 'households'));
    store.setStatus('ready');
    return 'ready' as const;
  }

  /** Clears one household's data before showing another, keeping who I am and my households. */
  function clearHouseholdData() {
    store.update((s) => ({
      ...emptyState(),
      myHouseholds: s.myHouseholds,
      administering: s.administering,
      preferences: s.preferences,
    }));
  }

  function signedOutLocally() {
    householdId = null;
    user = null;
    outbox.clear();
    store.reset('signedOut');
  }

  auth.onSignedOut(signedOutLocally);

  const actions = {
    /** Called once on launch: resumes a saved sign-in. */
    async restore() {
      const saved = await auth.restore();
      if (!saved) {
        store.setStatus('signedOut');
        return;
      }
      try {
        await enter(saved.householdId);
      } catch (error) {
        if (isNetworkError(error)) store.setStatus('unreachable');
        else signedOutLocally();
      }
    },

    async retryConnection() {
      store.setStatus('restoring');
      await actions.restore();
    },

    async signIn(username: string, password: string) {
      const session = await Api.login(username.trim(), password);
      await auth.save({ accessToken: session.accessToken, refreshToken: session.refreshToken, householdId: null });
      return enter(auth.current?.householdId);
    },

    async register(input: { username: string; email: string; password: string; fullName: string }) {
      const session = await Api.register(input);
      await auth.save({ accessToken: session.accessToken, refreshToken: session.refreshToken, householdId: null });
      user = session.user;
      householdId = null;
      store.reset('noHousehold');
    },

    async completePasswordReset(email: string, code: string, password: string) {
      const session = await Api.resetPassword(email, code, password);
      await auth.save({ accessToken: session.accessToken, refreshToken: session.refreshToken, householdId: null });
      return enter(null);
    },

    async signOut() {
      try {
        await Api.logout();
      } catch {
        // Signing out locally is what matters.
      }
      await auth.clear();
      signedOutLocally();
    },

    async createHousehold(input: { householdName: string; yourName: string; withRoutines: boolean }) {
      const created = await Api.createHousehold({
        name: input.householdName.trim(),
        displayName: input.yourName.trim(),
        starterRoutines: input.withRoutines,
      });
      householdId = created.household.id;
      await auth.setHousehold(householdId);
      if (!user) user = (await Api.me()).user;
      clearHouseholdData();
      await refresh();
      store.setStatus('ready');
    },

    /** Join by invite code — with the current account, or as a new passwordless account. */
    async joinHousehold(code: string, displayName: string) {
      // Joining while signed in moves to the new household; send what's waiting for this one first.
      if (outbox.size > 0) await syncNow();
      if (outbox.size > 0) {
        throw new Error('Some changes in this household haven’t synced yet. Try again when you’re back online.');
      }
      const joined = await Api.acceptInvite(code.trim().toUpperCase(), displayName.trim(), !!auth.current);
      if (joined.accessToken && joined.refreshToken) {
        await auth.save({ accessToken: joined.accessToken, refreshToken: joined.refreshToken, householdId: joined.householdId });
      } else {
        await auth.setHousehold(joined.householdId);
      }
      user = joined.user;
      householdId = joined.householdId;
      clearHouseholdData();
      await refresh();
      store.setStatus('ready');
    },

    refresh: () => refresh().catch((error) => {
      if (isNetworkError(error)) publishOutbox(false);
    }),

    // ── More than one household (H01–H12) ──

    /**
     * Opens another of my households. Changes waiting to sync belong to the current household,
     * so they're sent first; if they can't be, switching waits (it throws with a message).
     */
    async switchHousehold(id: string) {
      if (id === householdId) return;
      if (outbox.size > 0) await syncNow();
      if (outbox.size > 0) {
        throw new Error('Some changes in this household haven’t synced yet. Try again when you’re back online.');
      }
      store.setStatus('restoring');
      clearHouseholdData();
      try {
        await enter(id);
      } catch (error) {
        store.setStatus('ready');
        throw error;
      }
    },

    /**
     * Leave a household (P04, H05). Leaving the one on screen moves to another household, or
     * to setting one up when it was the last. Returns where to go next.
     */
    async leaveHousehold(id: string = hid()) {
      await Api.leaveHousehold(id);
      if (id !== householdId) {
        await refresh(['households']);
        return 'ready' as const;
      }
      clearHouseholdData();
      return enter(null);
    },

    /** The Primary Admin asks Ulé to delete the household (handled within 30 days). */
    requestHouseholdDeletion: () => Api.requestHouseholdDeletion(hid()),

    /** "All households": today's tasks for me in each household, labelled. Not kept in the store. */
    async loadAllHouseholdsToday() {
      const { tasks } = await Api.meToday();
      return tasks.map((t) => ({ ...toTask(t), householdId: t.householdId, householdName: t.householdName }));
    },

    // ── Tasks ──

    async loadTaskHistory(id: string) {
      try {
        const { history } = await Api.task(hid(), id);
        store.update((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, history: toHistory(history) } : t)),
        }));
      } catch {
        // History is a nice-to-have; the sheet still works without it.
      }
    },

    toggleTask(id: string) {
      const task = state().tasks.find((t) => t.id === id);
      if (!task) return Promise.resolve();
      return task.done ? actions.undoTask(id) : actions.completeTask(id);
    },

    completeTask(id: string, markInventoryAvailable = false) {
      const task = state().tasks.find((t) => t.id === id);
      // A future round of a recurring task waits for its day (the server refuses it too).
      if (task?.notYet) return Promise.resolve();
      return mutate({
        label: [{ text: 'Ticked off ' }, { text: task?.title ?? 'a task', bold: true }],
        optimistic: (s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: true, doneAt: formatClock(new Date()) } : t)),
        }),
        run: () => Api.completeTask(hid(), id, markInventoryAvailable),
        refresh: task?.linkedInventoryId ? ['tasks', 'inventory'] : ['tasks'],
      });
    },

    undoTask(id: string) {
      const task = state().tasks.find((t) => t.id === id);
      return mutate({
        label: [{ text: 'Reopened ' }, { text: task?.title ?? 'a task', bold: true }],
        optimistic: (s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: false, doneAt: undefined } : t)),
        }),
        run: () => Api.reopenTask(hid(), id),
        refresh: ['tasks'],
      });
    },

    reassignTask(id: string, memberId: string) {
      const task = state().tasks.find((t) => t.id === id);
      if (!task) return Promise.resolve();
      const send = (version: number) => Api.updateTask(hid(), id, { assigneeId: memberId, version });
      return mutate({
        label: [{ text: 'Reassigned ' }, { text: task.title, bold: true }],
        optimistic: (s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, assigneeId: memberId } : t)) }),
        run: () => send(task.version),
        keepMine: () => send(state().tasks.find((t) => t.id === id)?.version ?? task.version),
        itemName: task.title,
        refresh: ['tasks'],
      }).then(() => actions.loadTaskHistory(id));
    },

    nudgeTask(id: string, message: string) {
      const task = state().tasks.find((t) => t.id === id);
      return mutate({
        label: [{ text: 'Nudge about ' }, { text: task?.title ?? 'a task', bold: true }],
        run: () => Api.nudgeTask(hid(), id, message),
        refresh: [],
      });
    },

    deleteTask(id: string, scope: 'one' | 'all' = 'all') {
      const task = state().tasks.find((t) => t.id === id);
      return mutate({
        label: [{ text: 'Deleted ' }, { text: task?.title ?? 'a task', bold: true }],
        optimistic: (s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }),
        run: () => Api.deleteTask(hid(), id, scope),
        refresh: ['tasks'],
      });
    },

    saveTask(input: TaskInput, id?: string) {
      const existing = id ? state().tasks.find((t) => t.id === id) : undefined;
      if (existing) {
        const send = (version: number) => Api.updateTask(hid(), existing.id, { ...input, version });
        return mutate({
          label: [{ text: 'Edited ' }, { text: input.title, bold: true }],
          run: () => send(existing.version),
          keepMine: () => send(state().tasks.find((t) => t.id === existing.id)?.version ?? existing.version),
          itemName: input.title,
          refresh: ['tasks'],
        });
      }
      return mutate({
        label: [{ text: 'Added ' }, { text: input.title, bold: true }],
        run: () => Api.createTask(hid(), input),
        refresh: ['tasks'],
      });
    },

    // ── Calendar ──

    saveEvent(input: EventInput & { prepTask?: boolean }, id?: string) {
      const existing = id ? state().events.find((e) => e.id === id) : undefined;
      if (existing) {
        const send = (version: number) => Api.updateEvent(hid(), existing.id, { ...input, version });
        return mutate({
          label: [{ text: 'Edited ' }, { text: input.title, bold: true }],
          run: () => send(existing.version),
          keepMine: () => send(state().events.find((e) => e.id === existing.id)?.version ?? existing.version),
          itemName: input.title,
          refresh: ['events'],
        });
      }
      return mutate({
        label: [{ text: 'Added ' }, { text: input.title, bold: true }],
        run: () => Api.createEvent(hid(), input),
        refresh: input.prepTask ? ['events', 'tasks'] : ['events'],
      });
    },

    /** Accept or decline an invitation. The event stays on the calendar either way. */
    respondToEvent(id: string, response: 'accepted' | 'declined') {
      const event = state().events.find((e) => e.id === id);
      const me = state().currentUserId;
      return mutate({
        label: [{ text: response === 'accepted' ? 'Accepted ' : 'Declined ' }, { text: event?.title ?? 'an invitation', bold: true }],
        optimistic: (s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === id ? { ...e, invitees: e.invitees.map((i) => (i.memberId === me ? { ...i, response } : i)) } : e,
          ),
        }),
        run: () => Api.respondToEvent(hid(), id, response),
        refresh: ['events'],
      });
    },

    deleteEvent(id: string) {
      const event = state().events.find((e) => e.id === id);
      return mutate({
        label: [{ text: 'Deleted ' }, { text: event?.title ?? 'an event', bold: true }],
        optimistic: (s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }),
        run: () => Api.deleteEvent(hid(), id),
        refresh: ['events'],
      });
    },

    // ── Shopping ──

    toggleShoppingItem(id: string) {
      const item = state().shopping.find((i) => i.id === id);
      if (!item) return Promise.resolve();
      const inBasket = !item.inBasket;
      const send = (version: number) => Api.updateShoppingItem(hid(), id, { inBasket, version });
      return mutate({
        label: [{ text: inBasket ? 'Ticked ' : 'Unticked ' }, { text: item.name, bold: true }],
        optimistic: (s) => ({
          ...s,
          shopping: s.shopping.map((i) => (i.id === id ? { ...i, inBasket, pendingSync: !s.sync.online } : i)),
        }),
        run: () => send(item.version),
        keepMine: () => send(state().shopping.find((i) => i.id === id)?.version ?? item.version),
        itemName: item.name,
        refresh: ['shopping'],
      });
    },

    /** Part-buying: "2 litres · bought 1/2". Buying all of it ticks the item. */
    setBoughtQty(id: string, boughtQty: number) {
      const item = state().shopping.find((i) => i.id === id);
      if (!item) return Promise.resolve();
      const bought = Math.max(0, Math.min(boughtQty, item.qty));
      const send = (version: number) => Api.updateShoppingItem(hid(), id, { boughtQty: bought, version });
      return mutate({
        label: [{ text: 'Bought ' }, { text: `${bought}/${item.qty} ${item.name}`, bold: true }],
        optimistic: (s) => ({
          ...s,
          shopping: s.shopping.map((i) =>
            i.id === id ? { ...i, boughtQty: bought, inBasket: bought >= i.qty, pendingSync: !s.sync.online } : i,
          ),
        }),
        run: () => send(item.version),
        keepMine: () => send(state().shopping.find((i) => i.id === id)?.version ?? item.version),
        itemName: item.name,
        refresh: ['shopping'],
      });
    },

    saveShoppingItem(input: ShoppingInput, id?: string) {
      const existing = id ? state().shopping.find((i) => i.id === id) : undefined;
      if (existing) {
        const send = (version: number) => Api.updateShoppingItem(hid(), existing.id, { ...input, version });
        return mutate({
          label: [{ text: 'Edited ' }, { text: input.name, bold: true }],
          run: () => send(existing.version),
          keepMine: () => send(state().shopping.find((i) => i.id === existing.id)?.version ?? existing.version),
          itemName: input.name,
          refresh: ['shopping'],
        });
      }
      return mutate({
        label: [{ text: 'Added ' }, { text: input.name, bold: true }],
        run: () => Api.addShoppingItem(hid(), input),
        refresh: ['shopping'],
      });
    },

    removeShoppingItem(id: string) {
      const item = state().shopping.find((i) => i.id === id);
      return mutate({
        label: [{ text: 'Removed ' }, { text: item?.name ?? 'an item', bold: true }],
        optimistic: (s) => ({ ...s, shopping: s.shopping.filter((i) => i.id !== id) }),
        run: () => Api.deleteShoppingItem(hid(), id),
        refresh: ['shopping'],
      });
    },

    setShopper(memberId: string, when: string, sendList = false) {
      return mutate({
        label: [{ text: 'Changed the shopper' }],
        optimistic: (s) => ({ ...s, shopper: { memberId, when } }),
        run: () => Api.setShopper(hid(), memberId, when, sendList),
        refresh: ['household'],
      });
    },

    // ── Shopping requests ──

    /** Send a list for Admin approval. Throws on failure so the screen can stay put. */
    async sendRequest(items: RequestItemInput[]) {
      const { request } = await Api.sendRequest(hid(), items);
      await refresh(['requests', 'notifications']).catch(() => {});
      return toRequest(request);
    },

    /** Loads one request fresh (with "Already on the list" flags) and stores it. */
    async loadRequest(id: string) {
      const { request } = await Api.request(hid(), id);
      const loaded = toRequest(request);
      store.update((s) => ({
        ...s,
        requests: s.requests.some((r) => r.id === id) ? s.requests.map((r) => (r.id === id ? loaded : r)) : [loaded, ...s.requests],
      }));
      return loaded;
    },

    withdrawRequest(id: string) {
      return mutate({
        label: [{ text: 'Withdrew a shopping list' }],
        optimistic: (s) => ({ ...s, requests: s.requests.map((r) => (r.id === id ? { ...r, status: 'withdrawn' } : r)) }),
        run: () => Api.withdrawRequest(hid(), id),
        refresh: ['requests'],
      });
    },

    /** Approve, skipping some lines. Throws (e.g. 409 "already reviewed") so the screen can say so. */
    async approveRequest(id: string, skipItemIds: string[]) {
      const result = await Api.approveRequest(hid(), id, skipItemIds);
      await refresh(['requests', 'shopping', 'notifications']).catch(() => {});
      return { added: result.added, skipped: result.skipped };
    },

    async rejectRequest(id: string) {
      await Api.rejectRequest(hid(), id);
      await refresh(['requests', 'notifications']).catch(() => {});
    },

    /** Admin, while reviewing: change a line's name, quantity, category or price. Throws on failure. */
    async updateRequestItem(
      requestId: string,
      itemId: string,
      patch: { name?: string; qty?: number; unit?: string | null; category?: string | null; unitPrice?: number | null },
    ) {
      const { request } = await Api.updateRequestItem(hid(), requestId, itemId, patch);
      const updated = toRequest(request);
      store.update((s) => ({ ...s, requests: s.requests.map((r) => (r.id === requestId ? updated : r)) }));
      return updated;
    },

    async removeRequestItem(requestId: string, itemId: string) {
      const { request } = await Api.removeRequestItem(hid(), requestId, itemId);
      const updated = toRequest(request);
      store.update((s) => ({ ...s, requests: s.requests.map((r) => (r.id === requestId ? updated : r)) }));
      return updated;
    },

    // ── Done shopping & history ──

    /** "Finish shopping": records the trip with what was spent. Throws so the sheet can stay open. */
    async finishShopping(spent: number) {
      const result = await Api.finishShopping(hid(), spent);
      await refresh(['shopping', 'inventory', 'notifications']).catch(() => {});
      return result;
    },

    /** Shopping history isn't kept in the store; screens fetch it when opened. */
    trips: (shopperId?: string) => Api.trips(hid(), shopperId),
    trip: (tripId: string) => Api.trip(hid(), tripId),
    async updateTrip(tripId: string, body: { spent?: number; boughtItemIds?: string[] }) {
      const result = await Api.updateTrip(hid(), tripId, body);
      await refresh(['shopping']).catch(() => {});
      return result;
    },

    // ── Inventory ──

    /** Quantity, note, price — whatever this person may change. */
    updateInventoryItem(id: string, patch: Partial<InventoryInput>) {
      const item = state().inventory.find((i) => i.id === id);
      if (!item) return Promise.resolve();
      const send = (version: number) => Api.updateInventoryItem(hid(), id, { ...patch, version });
      return mutate({
        label: [{ text: 'Updated ' }, { text: item.name, bold: true }],
        run: () => send(item.version),
        keepMine: () => send(state().inventory.find((i) => i.id === id)?.version ?? item.version),
        itemName: item.name,
        refresh: patch.status ? ['inventory', 'shopping'] : ['inventory'],
      });
    },

    removeInventoryItem(id: string) {
      const item = state().inventory.find((i) => i.id === id);
      return mutate({
        label: [{ text: 'Removed ' }, { text: item?.name ?? 'an item', bold: true }],
        optimistic: (s) => ({ ...s, inventory: s.inventory.filter((i) => i.id !== id) }),
        run: () => Api.deleteInventoryItem(hid(), id),
        refresh: ['inventory'],
      });
    },

    setInventoryStatus(id: string, status: StockStatus) {
      const item = state().inventory.find((i) => i.id === id);
      if (!item) return Promise.resolve();
      const send = (version: number) => Api.updateInventoryItem(hid(), id, { status, version });
      return mutate({
        label: [{ text: 'Marked ' }, { text: item.name, bold: true }, { text: ` as ${status}` }],
        optimistic: (s) => ({ ...s, inventory: s.inventory.map((i) => (i.id === id ? { ...i, status } : i)) }),
        run: () => send(item.version),
        keepMine: () => send(state().inventory.find((i) => i.id === id)?.version ?? item.version),
        itemName: item.name,
        refresh: ['inventory', 'shopping'],
      });
    },

    addInventoryToList(id: string, qty: number, taskForId: string | null) {
      const item = state().inventory.find((i) => i.id === id);
      return mutate({
        label: [{ text: 'Added ' }, { text: item?.name ?? 'an item', bold: true }, { text: ' to the list' }],
        optimistic: (s) => ({ ...s, inventory: s.inventory.map((i) => (i.id === id ? { ...i, onList: true } : i)) }),
        run: () => Api.addInventoryToList(hid(), id, qty, taskForId),
        refresh: taskForId ? ['inventory', 'shopping', 'tasks'] : ['inventory', 'shopping'],
      });
    },

    saveInventoryItem(input: InventoryInput) {
      return mutate({
        label: [{ text: 'Added ' }, { text: input.name, bold: true }],
        run: () => Api.addInventoryItem(hid(), input),
        refresh: ['inventory', 'shopping'],
      });
    },

    // ── People ──

    /** Creates the invite on the server so its code can be shared. Throws on failure. */
    async inviteMember(input: { name: string; role: ApiRole; channel?: string }): Promise<Invite> {
      const { invite } = await Api.createInvite(hid(), { name: input.name.trim(), role: input.role, channel: input.channel });
      // Pending invites count towards the 5-person limit.
      await refresh(['invites', 'household']).catch(() => {});
      return toInvite(invite);
    },

    resendInvite(id: string) {
      return mutate({
        label: [{ text: 'Resent an invite' }],
        run: () => Api.resendInvite(hid(), id),
        refresh: ['invites', 'household'],
      });
    },

    cancelInvite(id: string) {
      return mutate({
        label: [{ text: 'Cancelled an invite' }],
        optimistic: (s) => ({ ...s, invites: s.invites.filter((i) => i.id !== id) }),
        run: () => Api.cancelInvite(hid(), id),
        refresh: ['invites', 'household'],
      });
    },

    updateMember(id: string, patch: Partial<Pick<Member, 'role' | 'canUpdateSupplies' | 'canSendRequests' | 'canSeePrices'>>) {
      return mutate({
        label: [{ text: 'Updated a member' }],
        optimistic: (s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) }),
        run: () => Api.updateMember(hid(), id, patch),
        refresh: ['household'],
      });
    },

    removeMember(id: string) {
      const member = state().members.find((m) => m.id === id);
      return mutate({
        label: [{ text: 'Removed ' }, { text: member?.name ?? 'a member', bold: true }],
        optimistic: (s) => ({ ...s, members: s.members.filter((m) => m.id !== id) }),
        run: () => Api.removeMember(hid(), id),
        refresh: ['household', 'tasks'],
      });
    },

    // ── Notifications & preferences ──

    markAllNotificationsRead() {
      return mutate({
        label: [{ text: 'Marked notifications read' }],
        optimistic: (s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, unread: false })) }),
        run: () => Api.markNotificationsRead(hid()),
        refresh: ['notifications'],
      });
    },

    updatePreferences(patch: Partial<Preferences>) {
      store.update((s) => ({ ...s, preferences: { ...s.preferences, ...patch } }));
      // keepSignedIn and lowDataMode stay on this phone; the rest belongs to the server.
      const body = {
        quietHours: patch.quietHours,
        quietFrom: patch.quietFrom,
        quietUntil: patch.quietUntil,
        quietSchedule: patch.quietSchedule,
        dailySummary: patch.dailySummary,
        dailySummaryAt: patch.dailySummaryAt ? toServerTime(patch.dailySummaryAt) : undefined,
        taskFinished: patch.taskFinished,
        lowStockAlerts: patch.lowStockAlerts,
      };
      if (Object.values(body).every((value) => value === undefined)) return Promise.resolve();
      return mutate({
        label: [{ text: 'Changed reminder settings' }],
        run: () => Api.updatePreferences(hid(), body),
        refresh: ['preferences'],
      });
    },

    sendFeedback(body: { rating?: number; topic?: string; message?: string; attachScreenshot?: boolean }) {
      return Api.sendFeedback(hid(), body);
    },

    // ── Offline sync ──

    syncNow,

    /** "Keep theirs": drop my change; the screen already shows the server's copy. */
    resolveConflict(changeId: string) {
      outbox.delete(changeId);
      publishOutbox();
    },

    /** "Keep mine": re-send my change on top of the latest copy. */
    async keepMine(changeId: string) {
      const item = outbox.get(changeId);
      outbox.delete(changeId);
      publishOutbox();
      if (!item?.keepMine) return;
      try {
        await item.keepMine();
        await refresh(item.refresh);
      } catch (error) {
        await handleFailure(error, { label: item.change.body, ...item, run: item.keepMine });
      }
    },

    // ── Form drafts (date/time and repeat pickers) ──

    setDraft(patch: Partial<Draft>) {
      store.update((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
    },

    resetDraft(patch: Partial<Draft> = {}) {
      store.update((s) => ({ ...s, draft: { ...EMPTY_DRAFT, ...patch } }));
    },
  };

  return actions;
}

export type HouseholdActions = ReturnType<typeof createActions>;
type HouseholdContextValue = { state: HouseholdState; status: Status; actions: HouseholdActions };

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

const REFRESH_EVERY_MS = 30_000;

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createStore(), []);
  const actions = useMemo(() => createActions(store), [store]);
  const snapshot = useSyncExternalStore(store.subscribe, store.get, store.get);

  // Resume a saved sign-in on launch.
  useEffect(() => {
    void actions.restore();
  }, [actions]);

  // Keep data fresh: on returning to the app, and every 30 seconds while it's open.
  useEffect(() => {
    const tick = () => {
      const { status, state } = store.get();
      if (status !== 'ready' || AppState.currentState !== 'active') return;
      if (!state.sync.online || state.sync.pending.some((p) => !p.conflict)) void actions.syncNow();
      else void actions.refresh();
    };
    const timer = setInterval(tick, REFRESH_EVERY_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [actions, store]);

  const value = useMemo(
    () => ({ state: snapshot.state, status: snapshot.status, actions }),
    [snapshot, actions],
  );
  return <HouseholdContext value={value}>{children}</HouseholdContext>;
}

export function useHousehold() {
  const context = use(HouseholdContext);
  if (!context) throw new Error('useHousehold must be used inside <HouseholdProvider>');
  return context;
}
