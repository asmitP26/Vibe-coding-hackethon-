import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  AlarmClock,
  AlertTriangle,
  Flame,
  Clock,
  CalendarX2,
  Sparkles,
  Check,
  X,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  AlarmClockOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePopover } from '../../hooks/usePopover';
import { buildAlerts, applyAlertState } from '../../services/alertsEngine';
import { getAlertState, saveAlertState } from '../../services/storageService';
import { playChime } from '../../utils/sound';
import { cn } from '../../lib/cn';

const ALERT_ICONS = {
  alarm: AlarmClock,
  alert: AlertTriangle,
  flame: Flame,
  clock: Clock,
  calendarX: CalendarX2,
  sparkles: Sparkles,
};

// Tone -> surface + dot colors for each alert row.
const TONE = {
  critical: { soft: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
  high: { soft: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
  attention: { soft: 'bg-brand-50 text-brand-600', dot: 'bg-brand-500' },
  safe: { soft: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
};

/**
 * NotificationBell - a Reminders & Alerts panel derived from live app data.
 * Surfaces upcoming reminders, critical/overdue deadlines, missed schedule
 * blocks, habit-streak risks, and AI nudges. Each alert can be opened, replanned
 * (deadline/missed), marked read, or dismissed. The unread badge only appears
 * when there is genuinely something unread (no fake red dot).
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const { tasks, habits, scheduleBlocks, recommendations, preferences, snoozeReminder, toggleTask, showToast, dataVersion } =
    useApp();
  const { open, setOpen, close, ref } = usePopover(false);
  const [alertState, setAlertState] = useState(() => getAlertState());

  // Re-sync after a demo reset (AppContext bumps dataVersion and clears the
  // stored alert state) so the bell doesn't keep showing stale read/dismissed.
  useEffect(() => {
    setAlertState(getAlertState());
  }, [dataVersion]);

  useEffect(() => {
    saveAlertState(alertState);
  }, [alertState]);

  const alerts = useMemo(
    () => buildAlerts({ tasks, habits, scheduleBlocks, recommendations, now: new Date() }),
    [tasks, habits, scheduleBlocks, recommendations],
  );

  const { visible, unreadCount } = useMemo(
    () => applyAlertState(alerts, alertState),
    [alerts, alertState],
  );

  const markRead = (id) =>
    setAlertState((s) => (s.read.includes(id) ? s : { ...s, read: [...s.read, id] }));

  const dismiss = (id) =>
    setAlertState((s) => ({
      read: s.read.filter((x) => x !== id),
      dismissed: s.dismissed.includes(id) ? s.dismissed : [...s.dismissed, id],
    }));

  const markAllRead = () =>
    setAlertState((s) => ({
      ...s,
      read: Array.from(new Set([...s.read, ...visible.map((a) => a.id)])),
    }));

  const openAlert = (alert) => {
    markRead(alert.id);
    close();
    navigate(alert.to || '/dashboard');
  };

  const replan = (alert) => {
    markRead(alert.id);
    close();
    navigate('/planner');
  };

  // Reminder-specific actions (snooze re-arms the alarm; mark-done completes the
  // task, which removes its reminder alert since it is no longer active).
  const snooze = (alert) => {
    if (!alert.taskId) return;
    snoozeReminder(alert.taskId, 10);
    showToast('Reminder snoozed for 10 minutes', 'info');
  };

  const markDone = (alert) => {
    if (!alert.taskId) return;
    toggleTask(alert.taskId);
    showToast('Task marked done \u2713', 'success');
  };

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0 && preferences?.reminderSound) playChime();
  };

  // Surface fired task reminders in their own section above the general alerts.
  const reminderAlerts = visible.filter((a) => a.type === 'task-reminder');
  const otherAlerts = visible.filter((a) => a.type !== 'task-reminder');

  const renderAlert = (alert) => {
    const Icon = ALERT_ICONS[alert.iconKey] || Bell;
    const tone = TONE[alert.tone] || TONE.attention;
    return (
      <div
        key={alert.id}
        className={cn(
          'group relative mb-1 rounded-xl border border-transparent p-2.5 transition-colors last:mb-0',
          alert.read ? 'opacity-70 hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-50',
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl', tone.soft)}>
            <Icon className="h-4 w-4" />
          </span>
          <button type="button" onClick={() => openAlert(alert)} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-1.5">
              {!alert.read && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} />}
              <span className="block truncate text-sm font-semibold text-slate-800">{alert.title}</span>
            </span>
            {alert.detail && <span className="mt-0.5 block text-xs text-slate-500">{alert.detail}</span>}
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            {!alert.read && (
              <button
                type="button"
                onClick={() => markRead(alert.id)}
                aria-label="Mark as read"
                title="Mark as read"
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-emerald-600"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              aria-label="Dismiss"
              title="Dismiss"
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-12">
          <button
            type="button"
            onClick={() => openAlert(alert)}
            className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            Open task
          </button>
          {alert.isReminder && (
            <>
              <span className="text-slate-200">·</span>
              <button
                type="button"
                onClick={() => snooze(alert)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-brand-600"
              >
                <AlarmClockOff className="h-3.5 w-3.5" />
                Snooze 10m
              </button>
              <span className="text-slate-200">·</span>
              <button
                type="button"
                onClick={() => markDone(alert)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-emerald-600"
              >
                <CircleCheck className="h-3.5 w-3.5" />
                Mark done
              </button>
            </>
          )}
          {alert.canReplan && (
            <>
              <span className="text-slate-200">·</span>
              <button
                type="button"
                onClick={() => replan(alert)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-brand-600"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Replan
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        className={cn(
          'relative grid h-10 w-10 place-items-center rounded-xl border bg-white transition-colors',
          open ? 'border-brand-300 text-brand-600' : 'border-slate-200 text-slate-500 hover:text-brand-600',
        )}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-40 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-glow backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Bell className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Reminders &amp; Alerts</p>
                  <p className="text-[11px] text-slate-400">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
                    <BellOff className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-semibold text-slate-700">You&apos;re all caught up</p>
                  <p className="text-xs text-slate-400">
                    New reminders and deadline alerts will appear here.
                  </p>
                </div>
              ) : (
                <>
                  {reminderAlerts.length > 0 && (
                    <div className="mb-1">
                      <p className="flex items-center gap-1.5 px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        <AlarmClock className="h-3.5 w-3.5 text-brand-500" />
                        Task reminders
                      </p>
                      {reminderAlerts.map(renderAlert)}
                    </div>
                  )}
                  {otherAlerts.length > 0 && (
                    <div>
                      {reminderAlerts.length > 0 && (
                        <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Alerts
                        </p>
                      )}
                      {otherAlerts.map(renderAlert)}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-100 px-2 py-2">
              <button
                type="button"
                onClick={() => {
                  close();
                  navigate('/reminders');
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
              >
                <AlarmClock className="h-3.5 w-3.5" />
                View all reminders
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
