const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function dayDiff(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date) {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7;
  return addDays(day, -offset);
}

/** Local `yyyy-mm-dd`, safe to pass through route params. */
export function toISODate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function fromISODate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Saturday, 26 September" */
export function formatLongDate(date: Date) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

/** "Sat, 17 Oct" — the date above the greeting on Home. */
export function formatHeaderDate(date: Date) {
  return `${weekdayShort(date)}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

/** "Sat 26 Sep" */
export function formatShortDate(date: Date) {
  return `${weekdayShort(date)} ${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

/** "Sat" */
export function weekdayShort(date: Date) {
  return DAY_NAMES[date.getDay()].slice(0, 3);
}

/** "S" */
export function weekdayLetter(date: Date) {
  return DAY_NAMES[date.getDay()][0];
}

/** "September 2026" */
export function formatMonthYear(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** "10:42am" */
export function formatClock(date: Date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${minutes}${suffix}`;
}

export function greeting(date: Date) {
  const hours = date.getHours();
  if (hours < 12) return 'Good morning';
  if (hours < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Monday-first grid of whole weeks covering the month that contains `date`. */
export function monthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(last), 6);
  const days: Date[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Parses "7:00am" / "12:30pm" into minutes after midnight, or null. */
export function parseClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(value.trim());
  if (!match) return null;
  let hours = Number(match[1]) % 12;
  if (match[3].toLowerCase() === 'pm') hours += 12;
  return hours * 60 + Number(match[2]);
}

/** A picked date ("2026-09-29") plus a time label ("10:00am") as one local moment; midnight if no time. */
export function combineDateTime(isoDate: string, clock: string | null) {
  const date = fromISODate(isoDate);
  const minutes = clock ? parseClock(clock) : null;
  if (minutes != null) date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

/** Parses 24-hour "22:00" into minutes after midnight, or null. */
export function parse24h(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** "22:00" → "10pm", "06:30" → "6:30am" */
export function format24hShort(value: string) {
  const total = parse24h(value);
  if (total == null) return value;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${h12}${suffix}` : `${h12}:${String(minutes).padStart(2, '0')}${suffix}`;
}
