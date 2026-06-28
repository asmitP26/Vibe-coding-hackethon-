import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { checkDueReminders, triggerReminder } from '../services/alarmService';

// How often the app re-checks for due reminders while it is open.
const CHECK_INTERVAL_MS = 30000;

/**
 * useReminderEngine - polls every 30 seconds (plus once immediately on mount)
 * for tasks whose reminder time has arrived and, for each, fires the alarm:
 *   - plays the reminder sound (respecting the "Reminder sound" preference),
 *   - shows a desktop notification when permission was granted,
 *   - shows an in-app toast with Open / Snooze 10m / Mark done actions,
 *   - marks the task's reminder as triggered (so it appears in the notification
 *     panel and never re-fires).
 *
 * NOTE: reminders only work while the app is open (see alarmService for the
 * background-notification limitation). Mount this hook exactly once, inside the
 * Router + AppProvider (it is mounted from AppShell).
 */
export function useReminderEngine() {
  const navigate = useNavigate();
  const { tasks, preferences, showToast, markReminderTriggered, snoozeReminder, toggleTask } =
    useApp();

  // Keep the latest state/handlers in a ref so the 30s interval (created once)
  // always reads fresh values without being torn down and recreated each render.
  const latest = useRef(null);
  latest.current = {
    tasks,
    preferences,
    showToast,
    markReminderTriggered,
    snoozeReminder,
    toggleTask,
    navigate,
  };

  // Dedupe guard keyed by `${taskId}|${reminderAt}` so a fired alarm can't
  // double-fire (React StrictMode runs effects twice in dev, and state updates
  // are async). A snooze changes reminderAt -> new key -> can fire again later.
  const firedKeys = useRef(new Set());

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled || !latest.current) return;
      const ctx = latest.current;
      // Respect the user's onboarding choice - if reminders are turned off,
      // the engine stays silent (no sound, notifications or toasts).
      if (ctx.preferences?.remindersEnabled === false) return;
      const due = checkDueReminders(ctx.tasks, new Date());
      let soundPlayed = false;

      due.forEach((task) => {
        const key = `${task.id}|${task.reminderAt}`;
        if (firedKeys.current.has(key)) return;
        firedKeys.current.add(key);

        // Mark first so the next tick (and re-renders) won't re-detect it.
        ctx.markReminderTriggered(task.id);

        const soundEnabled = !soundPlayed && ctx.preferences?.reminderSound !== false;
        if (soundEnabled) soundPlayed = true;

        triggerReminder(task, {
          soundEnabled,
          onClick: () => ctx.navigate('/tasks'),
        });

        ctx.showToast(`\u23f0 Reminder: ${task.title}`, 'info', {
          duration: 9000,
          actions: [
            { label: 'Open', onClick: () => ctx.navigate('/tasks') },
            { label: 'Snooze 10m', onClick: () => ctx.snoozeReminder(task.id, 10) },
            { label: 'Mark done', onClick: () => ctx.toggleTask(task.id) },
          ],
        });
      });
    };

    run(); // catch anything already due the moment the app opens
    const intervalId = setInterval(run, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);
}

export default useReminderEngine;
