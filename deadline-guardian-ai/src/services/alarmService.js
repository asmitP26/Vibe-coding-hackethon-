/*
 * alarmService - task reminder/alarm engine helpers.
 *
 * Pure detection helpers (scheduleTaskAlarms, checkDueReminders,
 * markReminderTriggered) plus the browser side-effects a fired reminder needs
 * (triggerReminder, requestNotificationPermission, playReminderSound).
 *
 * The reminder loop itself lives in `useReminderEngine` (a hook mounted once in
 * AppShell) which polls these helpers every 30 seconds and updates task state.
 *
 * ---------------------------------------------------------------------------
 * IMPORTANT LIMITATION:
 *   Reminders only fire while the app/tab is open and running. JavaScript timers
 *   and the in-page Notifications API cannot wake a closed app. For TRUE
 *   background reminders (delivered when the app is closed), a future extension
 *   can register a PWA service worker and use the Push API + persistent
 *   `ServiceWorkerRegistration.showNotification` with notification actions.
 * ---------------------------------------------------------------------------
 */
import { playAlarm } from '../utils/sound';

/** A task is reminder-eligible when it has an armed, untriggered reminder. */
const hasArmedReminder = (t) =>
  !!t &&
  t.status !== 'completed' &&
  t.reminderEnabled === true &&
  t.reminderTriggered !== true &&
  !!t.reminderAt;

/**
 * Return the still-pending reminders sorted by fire time (soonest first).
 * Pure + informational - useful for inspecting/queuing upcoming alarms. In this
 * polling model nothing is registered with setTimeout (which would drift and
 * not survive refresh); the engine re-derives due reminders on every tick.
 */
export function scheduleTaskAlarms(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .filter(hasArmedReminder)
    .map((t) => ({ id: t.id, title: t.title, at: t.reminderAt, time: new Date(t.reminderAt).getTime() }))
    .filter((r) => Number.isFinite(r.time))
    .sort((a, b) => a.time - b.time);
}

/**
 * Return the tasks whose reminder is due NOW: enabled, not yet triggered, not
 * completed, and reminderAt <= now. Pure - the caller handles side effects.
 */
export function checkDueReminders(tasks, now = new Date()) {
  if (!Array.isArray(tasks)) return [];
  const ts = now instanceof Date ? now.getTime() : Date.now();
  return tasks.filter((t) => {
    if (!hasArmedReminder(t)) return false;
    const at = new Date(t.reminderAt).getTime();
    return Number.isFinite(at) && at <= ts;
  });
}

/**
 * Pure reducer: return a new tasks array with the given task's
 * `reminderTriggered` flag set to true. Used by the AppContext action of the
 * same name so a fired reminder is never re-fired (and persists across refresh).
 */
export function markReminderTriggered(tasks, taskId) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((t) => (t && t.id === taskId ? { ...t, reminderTriggered: true } : t));
}

/**
 * Ask the browser for notification permission. Only call this from a user
 * gesture (e.g. a button click). Resolves to the resulting permission string:
 * 'granted' | 'denied' | 'default' | 'unsupported'.
 */
export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Play the reminder alarm sound. No-op if audio is unavailable. */
export function playReminderSound() {
  playAlarm();
}

/**
 * Fire a single task reminder's side effects:
 *   - play the alarm sound (when `soundEnabled`),
 *   - show a desktop notification (when permission was granted).
 * Returns the Notification instance (or null). Fully guarded so a browser that
 * throws on `new Notification` can never crash the reminder loop. The in-app
 * toast + notification-panel entry are handled by the caller (React state).
 */
export function triggerReminder(task, options = {}) {
  const { soundEnabled = true, onClick } = options;
  if (soundEnabled) playReminderSound();

  let notification = null;
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      notification = new Notification('\u23f0 Task reminder', {
        body: task?.title || 'You have a task reminder.',
        tag: `dg-reminder-${task?.id || 'task'}`,
        renotify: true,
      });
      notification.onclick = (event) => {
        event?.preventDefault?.();
        try {
          window.focus();
        } catch {
          /* ignore */
        }
        onClick?.(task);
        try {
          notification.close();
        } catch {
          /* ignore */
        }
      };
    }
  } catch {
    /* Notifications can throw in some browsers/contexts - reminders still work
       via the in-app toast and panel, so we ignore this silently. */
  }
  return notification;
}

export default {
  scheduleTaskAlarms,
  checkDueReminders,
  markReminderTriggered,
  requestNotificationPermission,
  playReminderSound,
  triggerReminder,
};
