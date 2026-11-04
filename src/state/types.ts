import type { ApiEventReminder, ApiReminder, ApiRepeat } from '@/api/types';

export type Role = 'admin' | 'member' | 'child' | 'staff';

/** A structured repeat rule; `label` is what the app shows ("Tue & Fri"). */
export type RepeatRule = Omit<ApiRepeat, 'label'> & { label: string };

export type Member = {
  /** Membership id (people are per household). */
  id: string;
  name: string;
  fullName?: string;
  username?: string;
  email?: string;
  initials: string;
  role: Role;
  /** Primary Admin: created the household, can't leave or be removed. Other admins are Supporting. */
  isPrimary: boolean;
  /** Avatar fill and text colours. */
  color: string;
  textColor: string;
  joined: string;
  note?: string;
  /** Staff settings, switched by an Admin. */
  canUpdateSupplies: boolean;
  canSendRequests: boolean;
  canSeePrices: boolean;
};

export type Invite = {
  id: string;
  name: string;
  role: Role;
  code: string;
  link?: string;
  sentLabel: string;
  expiresInDays: number;
  channel?: string;
};

/** "week" runs to the end of Sunday; "later" is anything after that, or with no due date. */
export type TaskBucket = 'overdue' | 'today' | 'week' | 'later';

export type HistoryEntry = { label: string; when: string; tone: 'coral' | 'slate' | 'grey' };

export type Task = {
  id: string;
  title: string;
  assigneeId: string | null;
  createdBy: string;
  bucket: TaskBucket;
  /** ISO due date-time from the server, or null for "someday". */
  dueAt: string | null;
  anyTime: boolean;
  /** Time of day, e.g. "11:00am". */
  time?: string;
  /** Lateness or date label, e.g. "2 days late", "Tue, 7:00am". */
  dueLabel?: string;
  wasDue?: string;
  repeat?: string;
  repeatRule: RepeatRule | null;
  nextLabel?: string;
  context?: string;
  notes?: string;
  /** Human label ("1 day before, 6pm") and the code the server uses. */
  reminder?: string;
  reminderCode: ApiReminder | null;
  tellIfMissed: boolean;
  visibleTo: string;
  done: boolean;
  /** A recurring round due after today: it shows this week, but can't be ticked off until its day. */
  notYet: boolean;
  doneAt?: string;
  doneById?: string;
  linkedInventoryId?: string;
  /** Occurrences of a recurring task share a series. */
  seriesId?: string;
  history: HistoryEntry[];
  version: number;
};

export type InviteResponse = 'invited' | 'accepted' | 'declined';
export type Invitee = { memberId: string; response: InviteResponse };

export type CalendarEvent = {
  id: string;
  /** Unique per occurrence: recurring events appear once per date with the same `id`. */
  key: string;
  title: string;
  /** Days from today in local time. */
  dayOffset: number;
  startsAt: string;
  endsAt: string | null;
  start?: string;
  end?: string;
  allDay: boolean;
  place?: string;
  subtitle?: string;
  notes?: string;
  category?: string;
  kind: 'event' | 'holiday';
  accent: string;
  repeat?: string;
  repeatRule: RepeatRule | null;
  /** Human labels, and the codes the server uses. */
  reminders: string[];
  reminderCodes: ApiEventReminder[];
  remindedLabel?: string;
  createdBy?: string;
  /** The people who can see it, and what they replied. */
  invitees: Invitee[];
  version: number;
};

export type Store = 'Market' | 'Supermarket' | 'Other';

export type ShoppingItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice?: number;
  /** This person isn't allowed to see the price. */
  priceHidden: boolean;
  store: Store;
  addedBy?: string;
  fromLowStock: boolean;
  /** Approved request this came from ("Ayo's list"). */
  requestId?: string;
  /** How much is bought so far ("bought 1/2"). */
  boughtQty: number;
  inBasket: boolean;
  /** Changed on this phone and not yet synced. */
  pendingSync: boolean;
  buyerId?: string;
  version: number;
};

/** An approved list shown as its own section on the shopping list. */
export type ShoppingGroup = { id: string; requesterId?: string; reviewedById?: string; reviewedAt?: string };

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type RequestItem = {
  id: string;
  name: string;
  qty: number;
  unit?: string;
  category?: string;
  inventoryItemId?: string;
  /** Price per unit an Admin set while reviewing. */
  unitPrice?: number;
  added: boolean | null;
  alreadyOnList: boolean;
};

/** A shopping list sent for Admin approval. */
export type ShoppingRequest = {
  id: string;
  status: RequestStatus;
  requesterId?: string;
  requesterName: string;
  reviewedByName?: string;
  /** "today at 9:30am" */
  sentLabel: string;
  reviewedLabel?: string;
  items: RequestItem[];
};

export type StockStatus = 'available' | 'low' | 'out';

export type InventoryItem = {
  id: string;
  name: string;
  qty: string;
  group: string;
  status: StockStatus;
  updatedBy?: string;
  updatedAt?: string;
  onList: boolean;
  autoAddWhenLow: boolean;
  restockQty: number;
  restockUnit: string;
  quantity: number | null;
  unit?: string;
  /** Whole naira; shown as "₦1,250/litre". Absent when unset or hidden from this person. */
  price?: number;
  pricePer?: string;
  priceHidden: boolean;
  version: number;
};

/** Rich text as segments so lists can bold names without markup parsing. */
export type Segment = { text: string; bold?: boolean };

export type AppNotification = {
  id: string;
  /** e.g. 'event_invite', 'request_sent', 'task_completed'. */
  kind: string;
  body: Segment[];
  when: string;
  unread: boolean;
  action?: { label: string; href: string };
};

export type PendingChange = {
  id: string;
  body: Segment[];
  when: string;
  conflict?: { itemName: string; otherMemberId: string };
};

export type Preferences = {
  quietHours: boolean;
  /** 24-hour "22:00". */
  quietFrom: string;
  quietUntil: string;
  quietSchedule: 'every-day' | 'weekends-later';
  dailySummary: boolean;
  /** Display form, e.g. "6:30am". */
  dailySummaryAt: string;
  taskFinished: boolean;
  lowStockAlerts: boolean;
  /** Phone-only settings, not stored on the server. */
  keepSignedIn: boolean;
  lowDataMode: boolean;
};

export type Draft = {
  /** ISO date (yyyy-mm-dd) picked in the date & time sheet. */
  date: string | null;
  time: string | null;
  endTime: string | null;
  anyTime: boolean;
  /** Label of a custom repeat rule from the repeat sheet. */
  repeat: string | null;
  repeatRule: RepeatRule | null;
};

/** A household I belong to, for the switcher and My households (H01–H12). */
export type MyHousehold = {
  id: string;
  name: string;
  city: string;
  role: Role;
  isPrimary: boolean;
  /** "Mon 3 Aug" */
  joined: string;
  primaryAdminName?: string;
  overdue: number;
  toReview: number;
};

export type HouseholdState = {
  household: { id: string; name: string; timezone: string; timezoneShort: string; budget: number };
  /** Free Plan: people in this household (pending invites included) and the limit. */
  plan: { people: number; peopleLimit: number };
  /** Every household I belong to, the current one included. */
  myHouseholds: MyHousehold[];
  /** Free Individual: households I run, out of the limit. */
  administering: { count: number; limit: number };
  currentUserId: string;
  /** Whether the signed-in account has a password (people who joined by invite may not). */
  hasPassword: boolean;
  members: Member[];
  invites: Invite[];
  tasks: Task[];
  events: CalendarEvent[];
  shopping: ShoppingItem[];
  shoppingGroups: ShoppingGroup[];
  shopper: { memberId: string; when: string };
  /** Admins: every request. Everyone else: their own ("My requests"). */
  requests: ShoppingRequest[];
  inventory: InventoryItem[];
  notifications: AppNotification[];
  sync: { online: boolean; lastSynced: string; pending: PendingChange[] };
  preferences: Preferences;
  draft: Draft;
};
