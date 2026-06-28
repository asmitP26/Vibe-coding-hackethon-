import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Clock, Timer, Volume2, Send, BellRing, Sparkles, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePopover } from '../../hooks/usePopover';
import { fetchAIStatus, getAIStatus } from '../../services/geminiService';
import { requestNotificationPermission } from '../../services/alarmService';
import { cn } from '../../lib/cn';

const FOCUS_OPTIONS = [25, 30, 45, 50, 60, 90];

/** Initials from a display name (up to two words), always at least one letter. */
function initialsFrom(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'A';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Read the browser notification permission in a safe, display-friendly way. */
function readNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

const PERMISSION_META = {
  granted: { label: 'Enabled', dot: 'bg-emerald-500' },
  denied: { label: 'Blocked', dot: 'bg-red-500' },
  default: { label: 'Not enabled', dot: 'bg-slate-400' },
  unsupported: { label: 'Unsupported', dot: 'bg-slate-300' },
};

/** Small labelled toggle switch. */
function Toggle({ icon: Icon, label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-sm font-medium text-slate-700">{label}</span>
          {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-500' : 'bg-slate-200',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}

/**
 * ProfileMenu - the Topbar avatar opens a Profile & Preferences panel.
 * Shows identity (name, role, productivity style), live AI mode + notification
 * permission, and editable, persisted preferences (display name, work hours,
 * focus duration, reminder sound, voice auto-send).
 */
export default function ProfileMenu() {
  const { user, preferences, updatePreferences, resetDemoData } = useApp();
  const { open, setOpen, ref } = usePopover(false);
  const [aiStatus, setAiStatus] = useState(() => getAIStatus());
  const [permission, setPermission] = useState(() => readNotificationPermission());

  // Refresh live status whenever the panel opens.
  useEffect(() => {
    if (!open) return;
    setPermission(readNotificationPermission());
    fetchAIStatus()
      .then(setAiStatus)
      .catch(() => {
        /* never throws by design; keep current status */
      });
  }, [open]);

  const displayName = preferences.displayName || user.name || 'Asmit';
  const initials = initialsFrom(displayName);
  const live = aiStatus.mode === 'live';
  const aiLabel = live ? 'Gemini Live' : aiStatus.configured ? 'Mock fallback' : 'Mock AI';
  const perm = PERMISSION_META[permission] || PERMISSION_META.default;

  const requestPermission = () => {
    // Only meaningful while still 'default'; the service no-ops otherwise and
    // returns the current permission (or 'unsupported').
    requestNotificationPermission()
      .then((result) => setPermission(result))
      .catch(() => {
        /* user dismissed; leave as-is */
      });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile and preferences"
        aria-expanded={open}
        className={cn(
          'grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-bold text-white ring-2 transition-all',
          open ? 'ring-brand-200' : 'ring-transparent hover:ring-brand-100',
        )}
      >
        {initials}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-40 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-glow backdrop-blur-xl"
          >
            {/* Identity */}
            <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-br from-brand-50/60 to-indigo-50/40 px-4 py-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-500 text-base font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{preferences.role}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-brand-600 ring-1 ring-brand-100">
                  <Sparkles className="h-3 w-3" />
                  {preferences.productivityStyle} style
                </span>
              </div>
            </div>

            {/* Live status */}
            <div className="grid grid-cols-2 gap-2 px-4 py-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">AI mode</p>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <span className={cn('h-2 w-2 rounded-full', live ? 'bg-emerald-500' : aiStatus.configured ? 'bg-amber-500' : 'bg-slate-400')} />
                  {aiLabel}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Notifications</p>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <span className={cn('h-2 w-2 rounded-full', perm.dot)} />
                  {perm.label}
                </span>
              </div>
            </div>

            {/* Desktop reminder permission */}
            {permission !== 'unsupported' && permission !== 'granted' && (
              <div className="px-4 pb-3">
                <button
                  type="button"
                  onClick={requestPermission}
                  disabled={permission === 'denied'}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                    permission === 'denied'
                      ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                      : 'bg-gradient-to-br from-brand-500 to-indigo-500 text-white shadow-glow hover:opacity-95',
                  )}
                >
                  <BellRing className="h-4 w-4" />
                  Enable desktop reminders
                </button>
                <p className="mt-1.5 text-center text-[11px] text-slate-400">
                  {permission === 'denied'
                    ? 'Blocked in your browser \u2014 in-app alerts still work.'
                    : 'Get a system pop-up when a task alarm rings.'}
                </p>
              </div>
            )}

            {/* Editable preferences */}
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Preferences
              </p>

              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Display name</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
                  <User className="h-4 w-4 text-slate-400" />
                  <input
                    value={preferences.displayName}
                    onChange={(e) => updatePreferences({ displayName: e.target.value })}
                    placeholder="Your name"
                    maxLength={40}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Day starts</span>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <input
                      type="time"
                      value={preferences.workStart}
                      onChange={(e) => updatePreferences({ workStart: e.target.value })}
                      className="w-full bg-transparent text-sm text-slate-700 outline-none"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Day ends</span>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <input
                      type="time"
                      value={preferences.workEnd}
                      onChange={(e) => updatePreferences({ workEnd: e.target.value })}
                      className="w-full bg-transparent text-sm text-slate-700 outline-none"
                    />
                  </div>
                </label>
              </div>

              <label className="mb-1 block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Focus block duration</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
                  <Timer className="h-4 w-4 text-slate-400" />
                  <select
                    value={preferences.focusDuration}
                    onChange={(e) => updatePreferences({ focusDuration: Number(e.target.value) })}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    {FOCUS_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <div className="mt-2 border-t border-slate-100 pt-1">
                <Toggle
                  icon={BellRing}
                  label="Reminders"
                  hint="Nudge me before tasks are due"
                  checked={preferences.remindersEnabled !== false}
                  onChange={(v) => updatePreferences({ remindersEnabled: v })}
                />
                <Toggle
                  icon={Volume2}
                  label="Reminder sound"
                  hint="Soft chime when alerts arrive"
                  checked={preferences.reminderSound === true}
                  onChange={(v) => updatePreferences({ reminderSound: v })}
                />
                <Toggle
                  icon={Send}
                  label="Voice auto-send"
                  hint="Send captured speech automatically"
                  checked={preferences.voiceAutoSend === true}
                  onChange={(v) => updatePreferences({ voiceAutoSend: v })}
                />
              </div>
            </div>

            {/* Demo reset */}
            <div className="border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  setOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset demo data
              </button>
              <p className="mt-1.5 text-center text-[11px] text-slate-400">
                Restores the sample tasks, habits and reminders — handy for a fresh demo.
              </p>
            </div>

            <p className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
              <BellRing className="h-3 w-3" />
              Preferences are saved on this device.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
