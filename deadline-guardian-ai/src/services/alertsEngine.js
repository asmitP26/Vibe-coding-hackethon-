/*
 * alertsEngine - derives the Topbar "Reminders & Alerts" feed from live app data.
 *
 * Pure and never throws. Alert ids are DETERMINISTIC (type + entity id) so the
 * read / dismissed bookkeeping persisted in localStorage stays stable across
 * refreshes. The UI maps `iconKey` + `tone` to icons/colors and decides which
 * actions to show (open related task, replan) from `taskId` / `canReplan`.
 */
import { hoursUntil, isOverdue, relativeDeadline, formatReminderLabel } from '../utils/dateUtils';

// Severity ordering so the most urgent alerts float to the top.
const SEVERITY = { critical: 0, high: 1, attention: 2, safe: 3 };

const MAX_ALERTS = 14;

const isActiveTask = (t) => t && t.status !== 'completed';

/** Parse a block's "HH:MM" time into a Date on the same calendar day as `now`. */
function blockTimeToday(time, now) {
  const [h, m] = String(time || '').split(':').map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(h)) return null;
  const d = new Date(now);
  d.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/**
 * Build the alert feed. Returns an array of:
 *   { id, type, iconKey, tone, title, detail, taskId?, to, canReplan }
 * sorted by severity. Each generator is defensive so missing fields are skipped
 * rather than throwing.
 */
export function buildAlerts(data = {}) {
  const now = data.now instanceof Date ? data.now : new Date();
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const habits = Array.isArray(data.habits) ? data.habits : [];
  const scheduleBlocks = Array.isArray(data.scheduleBlocks) ? data.scheduleBlocks : [];
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];

  const alerts = [];
  const flaggedTaskIds = new Set();

  // 0. Fired task reminders (user-set alarms that have triggered) -------------
  // These are the most actionable items, so they take precedence over the
  // task's generic deadline alert (deduped via flaggedTaskIds below). The id
  // includes reminderAt so a re-scheduled (snoozed) reminder is treated as a
  // fresh, unread alert rather than inheriting a previous read/dismissed state.
  tasks.filter(isActiveTask).forEach((t) => {
    if (!t.reminderEnabled || !t.reminderTriggered || !t.reminderAt) return;
    flaggedTaskIds.add(t.id);
    alerts.push({
      id: `task-reminder-${t.id}-${t.reminderAt}`,
      type: 'task-reminder',
      iconKey: 'alarm',
      tone: 'high',
      title: `Reminder: ${t.title}`,
      detail: `Alarm set for ${formatReminderLabel(t.reminderAt)}`,
      taskId: t.id,
      to: '/tasks',
      canReplan: false,
      isReminder: true,
    });
  });

  // 1. Critical / overdue deadline alerts ------------------------------------
  tasks.filter(isActiveTask).forEach((t) => {
    if (flaggedTaskIds.has(t.id)) return;
    const overdue = t.deadline ? isOverdue(t.deadline) : false;
    const critical = t.riskLevel === 'critical' || t.riskLevel === 'high';
    if (!overdue && !critical) return;
    flaggedTaskIds.add(t.id);
    alerts.push({
      id: `critical-${t.id}`,
      type: 'deadline',
      iconKey: overdue ? 'alert' : 'flame',
      tone: overdue || t.riskLevel === 'critical' ? 'critical' : 'high',
      title: overdue ? `Overdue: ${t.title}` : `Critical deadline: ${t.title}`,
      detail: t.deadline ? `Due ${relativeDeadline(t.deadline)}` : 'Needs attention now',
      taskId: t.id,
      to: '/tasks',
      canReplan: true,
    });
  });

  // 2. Upcoming task reminders (due soon, not already flagged) ----------------
  tasks.filter(isActiveTask).forEach((t) => {
    if (flaggedTaskIds.has(t.id) || !t.deadline) return;
    if (isOverdue(t.deadline)) return;
    const hrs = hoursUntil(t.deadline);
    if (hrs < 0 || hrs > 48) return; // only the next two days
    flaggedTaskIds.add(t.id);
    alerts.push({
      id: `reminder-${t.id}`,
      type: 'reminder',
      iconKey: 'clock',
      tone: 'attention',
      title: `Upcoming: ${t.title}`,
      detail: `Due ${relativeDeadline(t.deadline)}`,
      taskId: t.id,
      to: '/tasks',
      canReplan: true,
    });
  });

  // 3. Missed schedule blocks (ended earlier today, task still open) ----------
  scheduleBlocks.forEach((b) => {
    const end = blockTimeToday(b.end, now);
    if (!end || end.getTime() >= now.getTime()) return;
    const linked = b.taskId ? tasks.find((t) => t.id === b.taskId) : null;
    if (linked && !isActiveTask(linked)) return; // already done -> not "missed"
    alerts.push({
      id: `missed-${b.id}`,
      type: 'missed',
      iconKey: 'calendarX',
      tone: 'high',
      title: `Missed block: ${b.title}`,
      detail: `Was scheduled ${b.start}–${b.end}`,
      taskId: b.taskId || null,
      to: '/planner',
      canReplan: true,
    });
  });

  // 4. Habit streak alerts (streak at risk: not done today) -------------------
  habits.forEach((h) => {
    if (h.completedToday || !(h.streak > 0)) return;
    alerts.push({
      id: `streak-${h.id}`,
      type: 'habit',
      iconKey: 'flame',
      tone: 'attention',
      title: `Keep your ${h.streak}-day streak`,
      detail: `${h.name} isn't done today yet`,
      taskId: null,
      to: '/habits',
      canReplan: false,
    });
  });

  // 5. AI nudges (top recommendations) ---------------------------------------
  recommendations.slice(0, 2).forEach((r) => {
    alerts.push({
      id: `nudge-${r.id}`,
      type: 'nudge',
      iconKey: 'sparkles',
      tone: r.tone === 'critical' || r.tone === 'high' ? r.tone : 'safe',
      title: r.title || 'AI suggestion',
      detail: r.detail || '',
      taskId: null,
      to: '/assistant',
      canReplan: false,
    });
  });

  return alerts
    .sort((a, b) => (SEVERITY[a.tone] ?? 9) - (SEVERITY[b.tone] ?? 9))
    .slice(0, MAX_ALERTS);
}

/**
 * Merge derived alerts with persisted read/dismissed state.
 * Returns { visible, unreadCount }. Dismissed alerts are filtered out entirely;
 * `read` only affects the unread badge count.
 */
export function applyAlertState(alerts, state = {}) {
  const read = new Set(Array.isArray(state.read) ? state.read : []);
  const dismissed = new Set(Array.isArray(state.dismissed) ? state.dismissed : []);
  const visible = (Array.isArray(alerts) ? alerts : [])
    .filter((a) => !dismissed.has(a.id))
    .map((a) => ({ ...a, read: read.has(a.id) }));
  const unreadCount = visible.filter((a) => !a.read).length;
  return { visible, unreadCount };
}
