import { api } from './client';
import type {
  ApiAdministering,
  ApiEvent,
  ApiEventReminder,
  ApiHousehold,
  ApiInventoryItem,
  ApiInvite,
  ApiInvitePreview,
  ApiMember,
  ApiMembershipSummary,
  ApiNotification,
  ApiPlan,
  ApiPreferences,
  ApiReminder,
  ApiRepeat,
  ApiRole,
  ApiShoppingCan,
  ApiShoppingGroup,
  ApiShoppingItem,
  ApiShoppingRequest,
  ApiStore,
  ApiTask,
  ApiTaskActivity,
  ApiTaskCan,
  ApiTrip,
  ApiTripItem,
  ApiTripMonth,
  ApiTokens,
  ApiUser,
} from './types';

/** Repeat rule as sent to the server; it fills in `label` itself. */
export type RepeatInput = Omit<ApiRepeat, 'label'> & { label?: string };

export type TaskInput = {
  title: string;
  notes?: string | null;
  assigneeId?: string | null;
  dueAt?: string | null;
  anyTime?: boolean;
  repeat?: RepeatInput | null;
  reminder?: ApiReminder | null;
  tellIfMissed?: boolean;
  linkedInventoryId?: string | null;
};

export type EventInput = {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  place?: string | null;
  notes?: string | null;
  repeat?: RepeatInput | null;
  reminders?: ApiEventReminder[];
  /** "Who can see this event?" — nobody picked means just you. */
  inviteeIds?: string[];
};

export type ShoppingInput = {
  name: string;
  qty?: number;
  unit?: string;
  unitPrice?: number | null;
  store?: ApiStore;
  buyerId?: string | null;
};

export type InventoryInput = {
  name: string;
  group?: string;
  quantity?: number | null;
  unit?: string | null;
  status?: 'available' | 'low' | 'out';
  autoAddWhenLow?: boolean;
  restockQty?: number;
  restockUnit?: string;
  price?: number | null;
  pricePer?: string | null;
  note?: string | null;
};

export type RequestItemInput = {
  name: string;
  qty: number;
  unit?: string | null;
  category?: string | null;
  inventoryItemId?: string | null;
};

type Session = { user: ApiUser } & ApiTokens;

const h = (householdId: string) => `/households/${householdId}`;

export const Api = {
  // ── Accounts ──
  register: (body: { username: string; email: string; password: string; fullName: string }) =>
    api<Session>('/auth/register', { method: 'POST', body, anonymous: true }),
  usernameAvailable: (username: string) =>
    api<{ available: boolean }>('/auth/username-available', { query: { username }, anonymous: true }),
  login: (username: string, password: string) =>
    api<Session>('/auth/login', { method: 'POST', body: { username, password }, anonymous: true }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) => api<void>('/auth/forgot-password', { method: 'POST', body: { email }, anonymous: true }),
  resetPassword: (token: string, password: string) =>
    api<Session>('/auth/reset-password', { method: 'POST', body: { token, password }, anonymous: true }),
  me: () => api<{ user: ApiUser; households: ApiMembershipSummary[]; administering: ApiAdministering }>('/auth/me'),
  /** "All households": today's tasks for me in every household, labelled (H02). */
  meToday: () =>
    api<{ households: { id: string; name: string; role: ApiRole }[]; tasks: (ApiTask & { householdId: string; householdName: string })[] }>(
      '/auth/me/today',
    ),
  changePassword: (newPassword: string, currentPassword?: string) =>
    api<void>('/auth/me/password', { method: 'POST', body: { newPassword, currentPassword } }),

  // ── Households, people, invites ──
  createHousehold: (body: { name: string; displayName: string; starterRoutines: boolean; timezone?: string }) =>
    api<{ household: ApiHousehold; me: ApiMember }>('/households', { method: 'POST', body }),
  household: (id: string) => api<{ household: ApiHousehold; me: ApiMember; members: ApiMember[]; plan: ApiPlan }>(h(id)),
  leaveHousehold: (id: string) => api<void>(`${h(id)}/membership`, { method: 'DELETE' }),
  requestHouseholdDeletion: (id: string) =>
    api<{ request: { id: string; status: string; dueAt: string } }>(`${h(id)}/deletion-request`, { method: 'POST' }),
  updateMember: (
    id: string,
    memberId: string,
    body: Partial<Pick<ApiMember, 'role' | 'canUpdateSupplies' | 'canSendRequests' | 'canSeePrices'>>,
  ) =>
    api<{ member: ApiMember }>(`${h(id)}/members/${memberId}`, { method: 'PATCH', body }),
  removeMember: (id: string, memberId: string) =>
    api<{ unassignedRecurring: number }>(`${h(id)}/members/${memberId}`, { method: 'DELETE' }),
  invites: (id: string) => api<{ invites: ApiInvite[] }>(`${h(id)}/invites`),
  createInvite: (id: string, body: { name: string; role: ApiRole; channel?: string }) =>
    api<{ invite: ApiInvite }>(`${h(id)}/invites`, { method: 'POST', body }),
  resendInvite: (id: string, inviteId: string) =>
    api<{ invite: ApiInvite }>(`${h(id)}/invites/${inviteId}/resend`, { method: 'POST' }),
  cancelInvite: (id: string, inviteId: string) => api<void>(`${h(id)}/invites/${inviteId}`, { method: 'DELETE' }),
  previewInvite: (code: string) =>
    api<{ invite: ApiInvitePreview }>(`/invites/${encodeURIComponent(code)}`, { anonymous: true }),
  acceptInvite: (code: string, displayName: string, signedIn: boolean) =>
    api<{ householdId: string; me: ApiMember; user: ApiUser } & Partial<ApiTokens>>(
      `/invites/${encodeURIComponent(code)}/accept`,
      { method: 'POST', body: { displayName }, anonymous: !signedIn },
    ),

  // ── Tasks ──
  tasks: (id: string) => api<{ tasks: ApiTask[] }>(`${h(id)}/tasks`),
  task: (id: string, taskId: string) =>
    api<{ task: ApiTask; history: ApiTaskActivity[]; can: ApiTaskCan }>(`${h(id)}/tasks/${taskId}`),
  createTask: (id: string, body: TaskInput) => api<{ task: ApiTask }>(`${h(id)}/tasks`, { method: 'POST', body }),
  updateTask: (id: string, taskId: string, body: Partial<TaskInput> & { version: number }) =>
    api<{ task: ApiTask }>(`${h(id)}/tasks/${taskId}`, { method: 'PATCH', body }),
  completeTask: (id: string, taskId: string, markInventoryAvailable = false) =>
    api<{ task: ApiTask; next: ApiTask | null }>(`${h(id)}/tasks/${taskId}/complete`, {
      method: 'POST',
      body: { markInventoryAvailable },
    }),
  reopenTask: (id: string, taskId: string) =>
    api<{ task: ApiTask }>(`${h(id)}/tasks/${taskId}/reopen`, { method: 'POST' }),
  nudgeTask: (id: string, taskId: string, message: string) =>
    api<void>(`${h(id)}/tasks/${taskId}/nudge`, { method: 'POST', body: { message } }),
  deleteTask: (id: string, taskId: string, scope: 'one' | 'all') =>
    api<{ next: ApiTask | null }>(`${h(id)}/tasks/${taskId}`, { method: 'DELETE', query: { scope } }),

  // ── Calendar ──
  events: (id: string, from: string, to: string) =>
    api<{ events: ApiEvent[] }>(`${h(id)}/events`, { query: { from, to } }),
  respondToEvent: (id: string, eventId: string, response: 'accepted' | 'declined') =>
    api<{ event: ApiEvent }>(`${h(id)}/events/${eventId}/response`, { method: 'PUT', body: { response } }),
  createEvent: (id: string, body: EventInput & { prepTask?: boolean }) =>
    api<{ event: ApiEvent }>(`${h(id)}/events`, { method: 'POST', body }),
  updateEvent: (id: string, eventId: string, body: Partial<EventInput> & { version: number }) =>
    api<{ event: ApiEvent }>(`${h(id)}/events/${eventId}`, { method: 'PATCH', body }),
  deleteEvent: (id: string, eventId: string) => api<void>(`${h(id)}/events/${eventId}`, { method: 'DELETE' }),

  // ── Shopping ──
  shopping: (id: string) =>
    api<{ items: ApiShoppingItem[]; requests: ApiShoppingGroup[]; can: ApiShoppingCan }>(`${h(id)}/shopping`),
  addShoppingItem: (id: string, body: ShoppingInput) =>
    api<{ item: ApiShoppingItem }>(`${h(id)}/shopping`, { method: 'POST', body }),
  updateShoppingItem: (
    id: string,
    itemId: string,
    body: Partial<ShoppingInput> & { inBasket?: boolean; boughtQty?: number; version: number },
  ) =>
    api<{ item: ApiShoppingItem }>(`${h(id)}/shopping/${itemId}`, { method: 'PATCH', body }),
  deleteShoppingItem: (id: string, itemId: string) => api<void>(`${h(id)}/shopping/${itemId}`, { method: 'DELETE' }),
  setShopper: (id: string, memberId: string, when: string, sendList: boolean) =>
    api<void>(`${h(id)}/shopping/shopper`, { method: 'PUT', body: { memberId, when, sendList } }),

  // ── Shopping requests (lists sent for approval) ──
  requests: (id: string) => api<{ requests: ApiShoppingRequest[] }>(`${h(id)}/shopping/requests`),
  request: (id: string, requestId: string) =>
    api<{ request: ApiShoppingRequest }>(`${h(id)}/shopping/requests/${requestId}`),
  sendRequest: (id: string, items: RequestItemInput[]) =>
    api<{ request: ApiShoppingRequest }>(`${h(id)}/shopping/requests`, { method: 'POST', body: { items } }),
  withdrawRequest: (id: string, requestId: string) =>
    api<{ request: ApiShoppingRequest }>(`${h(id)}/shopping/requests/${requestId}/withdraw`, { method: 'POST' }),
  approveRequest: (id: string, requestId: string, skipItemIds: string[]) =>
    api<{ request: ApiShoppingRequest; added: number; skipped: number }>(
      `${h(id)}/shopping/requests/${requestId}/approve`,
      { method: 'POST', body: { skipItemIds } },
    ),
  rejectRequest: (id: string, requestId: string) =>
    api<{ request: ApiShoppingRequest }>(`${h(id)}/shopping/requests/${requestId}/reject`, { method: 'POST' }),
  updateRequestItem: (
    id: string,
    requestId: string,
    itemId: string,
    body: { name?: string; qty?: number; unit?: string | null; category?: string | null; unitPrice?: number | null },
  ) =>
    api<{ request: ApiShoppingRequest }>(`${h(id)}/shopping/requests/${requestId}/items/${itemId}`, { method: 'PATCH', body }),
  removeRequestItem: (id: string, requestId: string, itemId: string) =>
    api<{ request: ApiShoppingRequest }>(`${h(id)}/shopping/requests/${requestId}/items/${itemId}`, { method: 'DELETE' }),

  // ── Done shopping & history ──
  finishShopping: (id: string, spent: number) =>
    api<{ tripId: string; purchased: number; stillOnList: number }>(`${h(id)}/shopping/checkout`, {
      method: 'POST',
      body: { spent },
    }),
  trips: (id: string, shopperId?: string) =>
    api<{ months: ApiTripMonth[]; trips: ApiTrip[] }>(`${h(id)}/shopping/trips`, {
      query: shopperId ? { shopperId } : undefined,
    }),
  trip: (id: string, tripId: string) => api<{ trip: ApiTrip & { items: ApiTripItem[] } }>(`${h(id)}/shopping/trips/${tripId}`),
  updateTrip: (id: string, tripId: string, body: { spent?: number; boughtItemIds?: string[] }) =>
    api<{ trip: ApiTrip & { items: ApiTripItem[] } }>(`${h(id)}/shopping/trips/${tripId}`, { method: 'PATCH', body }),

  // ── Inventory ──
  inventory: (id: string) => api<{ items: ApiInventoryItem[] }>(`${h(id)}/inventory`),
  addInventoryItem: (id: string, body: InventoryInput) =>
    api<{ item: ApiInventoryItem }>(`${h(id)}/inventory`, { method: 'POST', body }),
  updateInventoryItem: (id: string, itemId: string, body: Partial<InventoryInput> & { version: number }) =>
    api<{ item: ApiInventoryItem }>(`${h(id)}/inventory/${itemId}`, { method: 'PATCH', body }),
  deleteInventoryItem: (id: string, itemId: string) => api<void>(`${h(id)}/inventory/${itemId}`, { method: 'DELETE' }),
  addInventoryToList: (id: string, itemId: string, qty: number, taskForId: string | null) =>
    api<void>(`${h(id)}/inventory/${itemId}/add-to-list`, { method: 'POST', body: { qty, taskForId } }),

  // ── Notifications, preferences, feedback ──
  notifications: (id: string) => api<{ notifications: ApiNotification[] }>(`${h(id)}/notifications`),
  markNotificationsRead: (id: string) => api<void>(`${h(id)}/notifications/read`, { method: 'POST', body: {} }),
  preferences: (id: string) => api<{ preferences: ApiPreferences }>(`${h(id)}/preferences`),
  updatePreferences: (id: string, body: Partial<ApiPreferences>) =>
    api<{ preferences: ApiPreferences }>(`${h(id)}/preferences`, { method: 'PUT', body }),
  sendFeedback: (id: string, body: { rating?: number; topic?: string; message?: string; attachScreenshot?: boolean }) =>
    api<void>(`${h(id)}/feedback`, { method: 'POST', body }),
};
