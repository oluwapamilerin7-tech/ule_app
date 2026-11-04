/** Shapes returned by the Ulé API (see ule_backend/docs/API.md). Dates arrive as ISO strings. */

export type ApiRole = 'admin' | 'member' | 'child' | 'staff';

export type ApiUser = {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  hasPassword: boolean;
};

export type ApiTokens = { accessToken: string; refreshToken: string; expiresIn: number };

/** One of the households the signed-in person belongs to, with their role there (H01–H12). */
export type ApiMembershipSummary = {
  id: string;
  name: string;
  timezone: string;
  city: string;
  membershipId: string;
  displayName: string;
  role: ApiRole;
  isPrimary: boolean;
  joinedAt: string;
  primaryAdminName: string | null;
  /** "2 overdue · 2 requests to review" */
  overdue: number;
  toReview: number;
};

/** Free Individual: how many households this person runs, out of how many allowed. */
export type ApiAdministering = { count: number; limit: number };

/** Free Household: people (pending invites included) out of the limit. */
export type ApiPlan = { name: string; people: number; peopleLimit: number };

export type ApiMember = {
  id: string;
  userId: string;
  displayName: string;
  initials: string;
  role: ApiRole;
  canUpdateSupplies: boolean;
  canSendRequests: boolean;
  canSeePrices: boolean;
  /** Primary Admin (created the household); an admin who isn't primary is the Supporting Admin. */
  isPrimary: boolean;
  joinedAt: string;
};

export type ApiHousehold = {
  id: string;
  name: string;
  timezone: string;
  budget: number;
  shopper: { memberId: string | null; when: string };
};

export type ApiInvite = {
  id: string;
  name: string;
  role: ApiRole;
  code: string;
  link: string;
  channel: string | null;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  lastSentAt: string;
  expiresAt: string;
};

export type ApiRepeat = {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
  weekdays?: number[];
  until?: string;
  count?: number;
  label: string;
};

export type ApiReminder = 'day_before_6pm' | 'morning_of' | 'hour_before';

export type ApiTask = {
  id: string;
  title: string;
  notes: string | null;
  assigneeId: string | null;
  createdById: string | null;
  dueAt: string | null;
  anyTime: boolean;
  repeat: ApiRepeat | null;
  reminder: ApiReminder | null;
  tellIfMissed: boolean;
  visibility: 'adults' | 'adults_and_assignee' | 'everyone';
  linkedInventoryId: string | null;
  seriesId: string | null;
  done: boolean;
  completedAt: string | null;
  completedById: string | null;
  bucket: 'overdue' | 'today' | 'week' | 'later' | 'someday';
  version: number;
};

/** What the signed-in person may do with a task (from the task detail call). */
export type ApiTaskCan = { edit: boolean; complete: boolean; nudge: boolean };

export type ApiTaskActivity = {
  id: string;
  kind: 'created' | 'updated' | 'completed' | 'reopened' | 'reassigned' | 'nudged' | 'reminder_sent' | 'skipped';
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
};

export type ApiEventReminder = 'hour_before' | 'day_before_7pm' | 'morning_of';

export type ApiInviteResponse = 'invited' | 'accepted' | 'declined';
export type ApiInvitee = { memberId: string; response: ApiInviteResponse };

export type ApiEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  place: string | null;
  notes: string | null;
  category: string | null;
  kind: 'event' | 'holiday';
  repeat: ApiRepeat | null;
  reminders: ApiEventReminder[];
  createdById: string | null;
  /** Who can see the event; each invitee accepts or declines (Staff only view). */
  invitees: ApiInvitee[];
  version: number;
};

export type ApiStore = 'market' | 'supermarket' | 'other';

export type ApiShoppingItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number | null;
  /** True when this person isn't allowed to see the price. */
  priceHidden: boolean;
  store: ApiStore;
  addedById: string | null;
  buyerId: string | null;
  inventoryItemId: string | null;
  fromLowStock: boolean;
  /** Set when the item came from an approved request ("Ayo's list"). */
  requestId: string | null;
  boughtQty: number;
  inBasket: boolean;
  version: number;
};

/** Whose approved list a group of items came from, and who approved it. */
export type ApiShoppingGroup = { id: string; requesterId: string | null; reviewedById: string | null; reviewedAt: string | null };

export type ApiShoppingCan = { add: boolean; tick: boolean; setPrices: boolean; assignShopper: boolean };

export type ApiRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type ApiShoppingRequest = {
  id: string;
  status: ApiRequestStatus;
  requesterId: string | null;
  requesterName: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  items: {
    id: string;
    name: string;
    qty: number;
    unit: string | null;
    category: string | null;
    inventoryItemId: string | null;
    /** Set by an Admin while reviewing. */
    unitPrice: number | null;
    added: boolean | null;
    alreadyOnList: boolean;
  }[];
};

/** A finished shopping trip ("Done shopping"), for Shopping history. */
export type ApiTrip = {
  id: string;
  shopperId: string | null;
  shopperName: string | null;
  enteredByName: string | null;
  editedByName: string | null;
  editedAt: string | null;
  finishedAt: string;
  spent: number;
  estimate: number;
  /** Positive = under the estimate, negative = over. */
  difference: number;
  boughtCount: number;
  itemCount: number;
};

export type ApiTripItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number | null;
  lineTotal: number | null;
  requesterName: string | null;
  fromLowStock: boolean;
  bought: boolean;
};

export type ApiTripMonth = { month: string; label: string; tripCount: number; spent: number; estimate: number; difference: number };

export type ApiInventoryItem = {
  id: string;
  name: string;
  group: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  status: 'available' | 'low' | 'out';
  onList: boolean;
  autoAddWhenLow: boolean;
  restockQty: number;
  restockUnit: string;
  /** Whole naira per `pricePer` ("₦1,250/litre"); null when unset or hidden. */
  price: number | null;
  pricePer: string | null;
  priceHidden: boolean;
  updatedById: string | null;
  version: number;
  updatedAt: string;
};

export type ApiNotification = {
  id: string;
  kind: string;
  body: { text: string; bold?: boolean }[];
  action: { label: string; href: string } | null;
  unread: boolean;
  createdAt: string;
};

export type ApiPreferences = {
  quietHours: boolean;
  quietFrom: string;
  quietUntil: string;
  quietSchedule: 'every-day' | 'weekends-later';
  dailySummary: boolean;
  dailySummaryAt: string;
  taskFinished: boolean;
  lowStockAlerts: boolean;
};

export type ApiInvitePreview = {
  code: string;
  name: string;
  role: ApiRole;
  expiresAt: string;
  householdName: string;
  invitedBy: string | null;
  memberCount: number;
  memberInitials: string[];
};
