import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  GraduationCap,
  Briefcase,
  User,
  Layers,
  Clock,
  BellRing,
  ArrowRight,
} from 'lucide-react';
import Button from '../common/Button';
import { useApp } from '../../context/AppContext';
import { requestNotificationPermission } from '../../services/alarmService';
import { cn } from '../../lib/cn';

const USAGE_OPTIONS = [
  { value: 'Study', label: 'Study', icon: GraduationCap },
  { value: 'Work', label: 'Work', icon: Briefcase },
  { value: 'Personal', label: 'Personal', icon: User },
  { value: 'Mixed', label: 'Mixed', icon: Layers },
];

const ROLE_BY_USAGE = {
  Study: 'Student',
  Work: 'Professional',
  Personal: 'Personal',
  Mixed: 'Student / Builder',
};

const FOCUS_OPTIONS = [25, 30, 45, 50, 60, 90];

/** A small accessible on/off switch. */
function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-brand-500' : 'bg-slate-300',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/**
 * OnboardingModal - one-time welcome shown on the very first run. Self-gates on
 * preferences.onboarded; collects how the person works and saves it to their
 * profile so reminders, plans and focus sessions feel personal from minute one.
 */
export default function OnboardingModal() {
  const { preferences, updatePreferences } = useApp();
  const open = preferences?.onboarded === false;

  const [usage, setUsage] = useState(preferences?.usage || 'Mixed');
  const [workStart, setWorkStart] = useState(preferences?.workStart || '09:00');
  const [workEnd, setWorkEnd] = useState(preferences?.workEnd || '21:00');
  const [focusDuration, setFocusDuration] = useState(preferences?.focusDuration || 50);
  const [remindersEnabled, setRemindersEnabled] = useState(preferences?.remindersEnabled !== false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    if (remindersEnabled) {
      try {
        await requestNotificationPermission();
      } catch {
        /* permission denial is fine - in-app toasts still work */
      }
    }
    updatePreferences({
      onboarded: true,
      usage,
      role: ROLE_BY_USAGE[usage] || preferences?.role,
      workStart,
      workEnd,
      focusDuration: Number(focusDuration),
      remindersEnabled,
      reminderSound: remindersEnabled,
    });
  };

  const handleSkip = () => updatePreferences({ onboarded: true });

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-card sm:rounded-3xl sm:p-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-500 text-white shadow-glow">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 id="onboarding-title" className="text-lg font-extrabold tracking-tight text-slate-900">
                  Welcome to Deadline Guardian AI
                </h2>
                <p className="text-xs text-slate-500">
                  A few quick choices so your reminders and plans fit your day.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-6">
              {/* Usage */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">What are you using it for?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {USAGE_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const active = usage === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setUsage(value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-medium transition-all',
                          active
                            ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200',
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Work hours */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Clock className="h-4 w-4 text-slate-400" /> When do you usually work?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Start
                    <input
                      type="time"
                      value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)}
                      className="input"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    End
                    <input
                      type="time"
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                      className="input"
                    />
                  </label>
                </div>
              </div>

              {/* Focus duration */}
              <div>
                <label htmlFor="onboarding-focus" className="mb-2 block text-sm font-semibold text-slate-700">
                  Preferred focus session
                </label>
                <select
                  id="onboarding-focus"
                  value={focusDuration}
                  onChange={(e) => setFocusDuration(e.target.value)}
                  className="input"
                >
                  {FOCUS_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </div>

              {/* Reminders */}
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand-600 ring-1 ring-slate-200">
                    <BellRing className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Enable reminders</p>
                    <p className="text-xs text-slate-500">Get a nudge before things are due.</p>
                  </div>
                </div>
                <Toggle checked={remindersEnabled} onChange={setRemindersEnabled} label="Enable reminders" />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-7 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={handleSkip} disabled={saving}>
                Skip for now
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                Get started <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
