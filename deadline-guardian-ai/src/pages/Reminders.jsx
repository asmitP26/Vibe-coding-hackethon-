import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlarmClock,
  BellRing,
  Moon,
  Clock,
  CheckCircle2,
  BellOff,
  ArrowUpRight,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { resolveRisk } from '../services/taskEngine';
import { getRiskMeta } from '../utils/uiMeta';
import { formatReminderLabel, timeAgo } from '../utils/dateUtils';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { cn } from '../lib/cn';

/** A single reminder line with quick actions. */
function ReminderRow({ task, when, actions }) {
  const risk = getRiskMeta(resolveRisk(task));
  return (
    <motion.li
      variants={fadeInUp}
      layout
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex h-2 w-2 shrink-0 rounded-full', risk.dot)} />
          <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', risk.badge)}>
            {risk.label}
          </span>
          <span>{when}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{actions}</div>
    </motion.li>
  );
}

/** A pill-style quick action used inside a reminder row. */
function RowAction({ icon: Icon, label, onClick, tone = 'default' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
        tone === 'primary'
          ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Section({ icon: Icon, title, hint, count, emptyText, children }) {
  return (
    <section className="card p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            {title}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {count}
            </span>
          </h2>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </header>
      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white/40 px-4 py-8 text-center text-sm text-slate-400">
          {emptyText}
        </p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {children}
        </motion.ul>
      )}
    </section>
  );
}

export default function Reminders() {
  const { tasks, snoozeReminder, toggleTask, setTaskReminder, showToast } = useApp();
  const navigate = useNavigate();

  const { upcoming, triggered, snoozed } = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'completed' && t.reminderEnabled);
    return {
      triggered: active
        .filter((t) => t.reminderTriggered)
        .sort((a, b) => new Date(b.reminderAt) - new Date(a.reminderAt)),
      snoozed: active
        .filter((t) => t.reminderSnoozed && !t.reminderTriggered)
        .sort((a, b) => new Date(a.reminderAt) - new Date(b.reminderAt)),
      upcoming: active
        .filter((t) => t.reminderAt && !t.reminderTriggered && !t.reminderSnoozed)
        .sort((a, b) => new Date(a.reminderAt) - new Date(b.reminderAt)),
    };
  }, [tasks]);

  const onSnooze = (task) => {
    snoozeReminder(task.id, 10);
    showToast(`Snoozed "${task.title}" for 10 minutes`, 'info');
  };
  const onDone = (task) => {
    toggleTask(task.id);
    showToast(`Nice - "${task.title}" marked done`, 'success');
  };
  const onClear = (task) => {
    setTaskReminder(task.id, { reminderEnabled: false });
    showToast('Reminder cleared', 'info');
  };
  const openTask = () => navigate('/tasks');

  const baseActions = (task) => (
    <>
      <RowAction icon={Clock} label="Snooze 10m" onClick={() => onSnooze(task)} />
      <RowAction icon={CheckCircle2} label="Done" tone="primary" onClick={() => onDone(task)} />
      <RowAction icon={BellOff} label="Clear" onClick={() => onClear(task)} />
      <RowAction icon={ArrowUpRight} label="Open" onClick={openTask} />
    </>
  );

  const total = upcoming.length + triggered.length + snoozed.length;

  return (
    <div>
      <PageHeader
        title="Reminders"
        subtitle="Everything you've asked Deadline Guardian to nudge you about - in one place."
      />

      {total === 0 ? (
        <EmptyState
          icon={AlarmClock}
          title="No reminders yet"
          description="Open any task and set a reminder - it'll show up here so nothing slips through the cracks."
        />
      ) : (
        <div className="flex flex-col gap-5">
          <Section
            icon={AlarmClock}
            title="Upcoming"
            hint="Scheduled and waiting to nudge you."
            count={upcoming.length}
            emptyText="No upcoming reminders right now."
          >
            {upcoming.map((task) => (
              <ReminderRow
                key={task.id}
                task={task}
                when={`Reminds you ${formatReminderLabel(task.reminderAt)}`}
                actions={baseActions(task)}
              />
            ))}
          </Section>

          <Section
            icon={BellRing}
            title="Triggered"
            hint="Already went off - act on these or clear them."
            count={triggered.length}
            emptyText="Nothing has triggered yet."
          >
            {triggered.map((task) => (
              <ReminderRow
                key={task.id}
                task={task}
                when={`Triggered ${timeAgo(task.reminderAt)}`}
                actions={baseActions(task)}
              />
            ))}
          </Section>

          <Section
            icon={Moon}
            title="Snoozed"
            hint="Temporarily set aside - they'll come back around."
            count={snoozed.length}
            emptyText="No snoozed reminders."
          >
            {snoozed.map((task) => (
              <ReminderRow
                key={task.id}
                task={task}
                when={`Snoozed until ${formatReminderLabel(task.reminderAt)}`}
                actions={baseActions(task)}
              />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}
