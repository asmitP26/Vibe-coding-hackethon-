const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDate(value) {
  // Always return a NEW Date for Date inputs. The helpers below (startOfDay,
  // addDays) mutate via setHours/setDate; without cloning they would mutate the
  // caller's Date in place. That bug made getWeekDays() return 7 references to a
  // single object advanced 0+1+...+6 = 21 days ahead (duplicate React keys +
  // wrong week). Cloning keeps every helper pure and side-effect free.
  if (value instanceof Date) return new Date(value.getTime());
  if (value == null) return new Date(NaN);
  return new Date(value);
}

export function startOfDay(value = new Date()) {
  const d = toDate(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(value, days) {
  const d = toDate(value);
  d.setDate(d.getDate() + days);
  return d;
}

export function sameDay(a, b) {
  const da = toDate(a);
  const db = toDate(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function daysUntil(value) {
  const target = startOfDay(value).getTime();
  const today = startOfDay().getTime();
  return Math.round((target - today) / MS_PER_DAY);
}

export function hoursUntil(value) {
  return Math.round((toDate(value).getTime() - Date.now()) / (1000 * 60 * 60));
}

export function isOverdue(value) {
  return toDate(value).getTime() < Date.now();
}

export function formatDate(value) {
  return toDate(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(value) {
  return toDate(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(value) {
  return toDate(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTime(value) {
  return `${formatShortDate(value)} \u00b7 ${formatTime(value)}`;
}

export function weekdayShort(value) {
  return toDate(value).toLocaleDateString(undefined, { weekday: 'short' });
}

export function weekdayLong(value) {
  return toDate(value).toLocaleDateString(undefined, { weekday: 'long' });
}

export function relativeDeadline(value) {
  if (value == null) return 'No deadline';
  const days = daysUntil(value);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days < 7) return `in ${days} days`;
  if (days < 14) return 'next week';
  return `in ${Math.round(days / 7)} weeks`;
}

/** Human deadline label, safe for null/recurring tasks. */
export function formatDeadline(value) {
  if (value == null) return 'Recurring';
  return `${formatShortDate(value)} · ${formatTime(value)}`;
}

/** Compact relative-past label, e.g. "just now", "5m ago", "2h ago", "3d ago". */
export function timeAgo(value) {
  if (value == null) return '';
  const then = toDate(value).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.round((Date.now() - then) / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatShortDate(value);
}


export function getGreeting(date = new Date()) {
  const h = toDate(date).getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function startOfWeek(value = new Date()) {
  const d = startOfDay(value);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diff = (day + 6) % 7; // shift so the week starts on Monday
  return addDays(d, -diff);
}

export function getWeekDays(value = new Date()) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Convert a date / ISO value to a `<input type="datetime-local">` value string
 * ("YYYY-MM-DDTHH:mm") in LOCAL wall-clock time. Returns '' for invalid input.
 */
export function toDateTimeLocalValue(value) {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/**
 * Convert a `datetime-local` input value (local wall time) to a full ISO string.
 * Returns null for an empty or unparseable value.
 */
export function isoFromDateTimeLocal(local) {
  if (!local) return null;
  const d = new Date(local); // datetime-local has no zone -> parsed as local time
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Friendly label for a reminder time, e.g. "today at 4:00 PM",
 * "tomorrow at 9:00 AM", or "Jun 30 at 9:00 AM". Safe for null/invalid input.
 */
export function formatReminderLabel(value) {
  if (value == null) return '';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const days = daysUntil(d);
  const time = formatTime(d);
  if (days === 0) return `today at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  if (days === -1) return `yesterday at ${time}`;
  return `${formatShortDate(d)} at ${time}`;
}
