import { Palette } from '@/constants/theme';

import type { Draft, HouseholdState, Preferences, RepeatRule } from './types';

/**
 * Defaults and fixed lists used by the app. Household data itself comes from the Ulé API
 * (the demo "Bello Household" lives in the backend's seed: `npm run db:seed`).
 */

const AVATAR_COLORS: { color: string; textColor: string }[] = [
  { color: Palette.coral, textColor: Palette.ink },
  { color: Palette.slate, textColor: Palette.white },
  { color: Palette.line, textColor: Palette.ink },
  { color: Palette.ink, textColor: Palette.white },
  { color: Palette.grey, textColor: Palette.ink },
];

export function avatarColors(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function initialsFor(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return trimmed[0].toUpperCase();
}

export const EMPTY_DRAFT: Draft = {
  date: null,
  time: null,
  endTime: null,
  anyTime: false,
  repeat: null,
  repeatRule: null,
};

export const DEFAULT_PREFERENCES: Preferences = {
  quietHours: true,
  quietFrom: '22:00',
  quietUntil: '06:00',
  quietSchedule: 'every-day',
  dailySummary: true,
  dailySummaryAt: '6:30am',
  taskFinished: true,
  lowStockAlerts: false,
  keepSignedIn: true,
  lowDataMode: true,
};

/** State before anything has loaded (signed out). */
export function emptyState(): HouseholdState {
  return {
    household: { id: '', name: '', timezone: '', timezoneShort: '', budget: 0 },
    plan: { people: 0, peopleLimit: 5 },
    myHouseholds: [],
    administering: { count: 0, limit: 1 },
    currentUserId: '',
    hasPassword: true,
    members: [],
    invites: [],
    tasks: [],
    events: [],
    shopping: [],
    shoppingGroups: [],
    shopper: { memberId: '', when: 'Today' },
    requests: [],
    inventory: [],
    notifications: [],
    sync: { online: true, lastSynced: '', pending: [] },
    preferences: DEFAULT_PREFERENCES,
    draft: EMPTY_DRAFT,
  };
}

/** Preset repeat choices on the New task screen. */
export const PRESET_REPEATS: Record<'Daily' | 'Weekly' | 'Monthly', RepeatRule> = {
  Daily: { freq: 'daily', interval: 1, label: 'Daily' },
  Weekly: { freq: 'weekly', interval: 1, label: 'Weekly' },
  Monthly: { freq: 'monthly', interval: 1, label: 'Monthly' },
};

/** Suggested routines for the empty "new household" Home screen. */
export const SUGGESTED_ROUTINES: { title: string; repeat: string; caption: string; rule: RepeatRule }[] = [
  {
    title: 'Refill cooking gas',
    repeat: 'Monthly',
    caption: 'Monthly',
    rule: { freq: 'monthly', interval: 1, label: 'Monthly' },
  },
  {
    title: 'Put refuse out for collection',
    repeat: 'Tue & Fri',
    caption: 'Weekly · pick the days',
    rule: { freq: 'weekly', interval: 1, weekdays: [2, 5], label: 'Tue & Fri' },
  },
  {
    title: 'Service the generator',
    repeat: 'Every 3 months',
    caption: 'Every 3 months',
    rule: { freq: 'monthly', interval: 3, label: 'Every 3 months' },
  },
  {
    title: 'School run',
    repeat: 'Weekdays',
    caption: 'Weekdays',
    rule: { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5], label: 'Weekdays' },
  },
];

/** Items offered as "Often bought" suggestions in the add-item sheet. */
export const OFTEN_BOUGHT = [
  'Garri (white)',
  'Garri (yellow)',
  'Rice (10kg)',
  'Beans',
  'Palm oil',
  'Groundnut oil',
  'Tomatoes & tatashe',
  'Onions',
  'Bread',
  'Eggs (crate)',
  'Sugar',
  'Milk',
  'Indomie',
  'Yam',
  'Plantain',
  'Detergent',
  'Toilet roll',
  'Drinking water',
];
