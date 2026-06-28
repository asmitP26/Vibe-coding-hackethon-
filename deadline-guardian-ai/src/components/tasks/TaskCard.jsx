import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Gauge, Sparkles, Check, ChevronDown, Target, Bell, ListChecks, Loader2, RefreshCw, AlarmClock, X, Pencil } from 'lucide-react';
import { useState, memo } from 'react';
import Badge from '../common/Badge';
import { cn } from '../../lib/cn';
import { getRiskMeta, getStatusMeta } from '../../utils/uiMeta';
import { resolveScore, resolveRisk, subtaskDone, taskProgress, calculatePriorityScore, getRiskLevel } from '../../services/taskEngine';
import { formatDeadline, relativeDeadline, isOverdue, timeAgo, formatReminderLabel, toDateTimeLocalValue, isoFromDateTimeLocal } from '../../utils/dateUtils';
import { useApp } from '../../context/AppContext';
import { analyzeTask, breakDownTask, getAIMode } from '../../services/geminiService';

/** Human-friendly minutes: 30 -> "30m", 90 -> "1h 30m". */
function formatMinutes(min) {
  const m = Math.round(Number(min) || 0);
  if (m <= 0) return '';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function TaskCard({ task, onToggle, onToggleSubtask }) {
  const { applyBreakdown, updateTask, showToast, setTaskReminder } = useApp();
  const [open, setOpen] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reminderEditing, setReminderEditing] = useState(false);
  const [reminderInput, setReminderInput] = useState('');

  const risk = getRiskMeta(resolveRisk(task));
  const status = getStatusMeta(task.status);
  const score = resolveScore(task);
  const completed = task.status === 'completed';
  const overdue = !completed && task.deadline && isOverdue(task.deadline);
  const subtasks = task.subtasks || [];
  const doneSub = subtasks.filter(subtaskDone).length;
  const progress = taskProgress(task);

  const hasReminder = task.reminderEnabled && !!task.reminderAt;

  // Open the inline editor seeded with the current reminder (or a default of
  // one hour from now / the deadline) expressed in local wall-clock time.
  function openReminderEditor() {
    const seed = task.reminderAt
      ? task.reminderAt
      : task.deadline
        ? new Date(task.deadline)
        : Date.now() + 60 * 60 * 1000;
    setReminderInput(toDateTimeLocalValue(seed));
    setReminderEditing(true);
  }

  function saveReminder() {
    const iso = isoFromDateTimeLocal(reminderInput);
    if (!iso) {
      showToast('Pick a valid date & time for the reminder.', 'warning');
      return;
    }
    setTaskReminder(task.id, { reminderAt: iso, reminderEnabled: true });
    setReminderEditing(false);
    showToast('Reminder set \u23f0', 'success');
  }

  function removeReminder() {
    setTaskReminder(task.id, { reminderAt: null, reminderEnabled: false });
    setReminderEditing(false);
    showToast('Reminder removed', 'info');
  }

  async function handleBreakDown() {
    if (breaking) return;
    setBreaking(true);
    try {
      const result = await breakDownTask(task);
      const items = Array.isArray(result?.subtasks) ? result.subtasks : [];
      applyBreakdown(task.id, items);
      setOpen(true);
      const live = getAIMode() === 'live';
      showToast(
        live ? 'Task broken down with Gemini ✓' : 'Task broken down with Mock AI',
        live ? 'success' : 'info',
      );
    } catch (err) {
      // breakDownTask falls back internally; this only guards unexpected throws.
      console.warn('[TaskCard] breakDownTask failed - using local fallback.', err);
      applyBreakdown(task.id, [
        { title: `Clarify the goal of "${task.title}"`, estimatedEffort: 0.25 },
        { title: 'Gather what you need to start', estimatedEffort: 0.5 },
        { title: 'Do the main work in one focused block', estimatedEffort: 1 },
        { title: 'Review, polish, and finish', estimatedEffort: 0.5 },
      ]);
      setOpen(true);
      showToast('Gemini was unavailable - broke it down locally instead.', 'warning');
    } finally {
      setBreaking(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // Strip the cached score/risk so the AI (or the offline engine) recomputes
      // from the task's CURRENT deadline & importance instead of echoing stale
      // values back. Live Gemini analyzes fresh regardless.
      const analysis = await analyzeTask({ ...task, priorityScore: undefined, riskLevel: undefined });
      updateTask(task.id, {
        priorityScore: analysis.priorityScore ?? calculatePriorityScore(task),
        riskLevel: analysis.riskLevel ?? getRiskLevel(task),
        aiReason: analysis.reason ?? task.aiReason ?? '',
        nextBestAction: analysis.nextBestAction ?? task.nextBestAction ?? null,
        reminderMessage: analysis.reminderMessage ?? task.reminderMessage ?? null,
        lastAnalyzedAt: new Date().toISOString(),
      });
      const live = getAIMode() === 'live';
      showToast(
        live ? 'Priority refreshed with Gemini ✓' : 'Priority recalculated with Mock AI',
        live ? 'success' : 'info',
      );
    } catch (err) {
      // analyzeTask falls back internally; this guards truly unexpected throws.
      console.warn('[TaskCard] AI refresh failed - using local task engine.', err);
      updateTask(task.id, {
        priorityScore: calculatePriorityScore(task),
        riskLevel: getRiskLevel(task),
        aiReason: 'Recalculated locally while the AI assistant was unavailable.',
        lastAnalyzedAt: new Date().toISOString(),
      });
      showToast('Gemini was unavailable - recalculated locally instead.', 'warning');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="card group overflow-hidden p-0 transition-shadow duration-200 hover:border-brand-100 hover:shadow-soft"
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <button
          onClick={() => onToggle?.(task.id)}
          aria-label={completed ? 'Mark as not done' : 'Mark complete'}
          className={cn(
            'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors',
            completed
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 hover:border-brand-400',
          )}
        >
          {completed && <Check className="h-3.5 w-3.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3
              className={cn(
                'text-[15px] font-semibold text-slate-900',
                completed && 'text-slate-400 line-through',
              )}
            >
              {task.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-100">
                <Gauge className="h-3.5 w-3.5 text-brand-500" />
                {score}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Recalculate priority & risk with AI"
                aria-label="Refresh AI priority"
                className="grid h-7 w-7 place-items-center rounded-full text-slate-400 ring-1 ring-slate-100 transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge className={risk.badge} dot={risk.dot}>
              {risk.label}
            </Badge>
            <Badge className={status.badge}>{status.label}</Badge>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                overdue ? 'text-red-600' : 'text-slate-500',
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatDeadline(task.deadline)}
              {task.deadline && (
                <span className="text-slate-400">· {relativeDeadline(task.deadline)}</span>
              )}
            </span>
            <span className="text-xs text-slate-400">~{task.estimatedEffort}h effort</span>
            {task.category && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                {task.category}
              </span>
            )}
          </div>

          {/* Reminder / alarm */}
          {!reminderEditing ? (
            <div className="mt-2.5">
              {hasReminder ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">
                  <AlarmClock className="h-3.5 w-3.5 text-brand-500" />
                  Reminder {formatReminderLabel(task.reminderAt)}
                  {task.reminderTriggered && <span className="font-medium text-brand-400">· sent</span>}
                  <button
                    type="button"
                    onClick={openReminderEditor}
                    aria-label="Edit reminder"
                    title="Edit reminder"
                    className="ml-0.5 grid h-4 w-4 place-items-center rounded text-brand-400 transition-colors hover:text-brand-700"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={openReminderEditor}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-brand-300 hover:text-brand-600"
                >
                  <AlarmClock className="h-3.5 w-3.5" /> Set reminder
                </button>
              )}
            </div>
          ) : (
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <AlarmClock className="h-3.5 w-3.5 text-brand-500" /> Remind me at
              </label>
              <input
                type="datetime-local"
                value={reminderInput}
                onChange={(e) => setReminderInput(e.target.value)}
                className="input"
                aria-label="Reminder time"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveReminder}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  <Check className="h-3.5 w-3.5" /> Save
                </button>
                {hasReminder && (
                  <button
                    type="button"
                    onClick={removeReminder}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReminderEditing(false)}
                  className="ml-auto rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* AI reason */}
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50/70 px-3 py-2 text-xs text-brand-800">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
            <span><span className="font-semibold">AI:</span> {task.aiReason || 'Analyzed and prioritized.'}</span>
          </div>

          {/* Next best action (AI) */}
          {task.nextBestAction && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-indigo-50/70 px-3 py-2 text-xs text-indigo-800">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <span><span className="font-semibold">Next:</span> {task.nextBestAction}</span>
            </div>
          )}

          {/* Reminder nudge (AI) */}
          {task.reminderMessage && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-400">
              <Bell className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{task.reminderMessage}</span>
            </p>
          )}

          {/* Last analyzed timestamp / live recalculating indicator */}
          {(refreshing || task.lastAnalyzedAt) && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
              {refreshing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-brand-500" />
                  <span>Recalculating priority &amp; risk...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  <span>Last analyzed {timeAgo(task.lastAnalyzedAt)}</span>
                </>
              )}
            </p>
          )}

          {/* AI breakdown: empty state shows the "Break It Down" button, otherwise
              a progress bar + collapsible checklist of generated steps. */}
          <div className="mt-3">
            {subtasks.length === 0 ? (
              <button
                onClick={handleBreakDown}
                disabled={breaking}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {breaking ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Breaking it down...
                  </>
                ) : (
                  <>
                    <ListChecks className="h-3.5 w-3.5" /> Break It Down
                  </>
                )}
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-600"
                  >
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                    {doneSub}/{subtasks.length} steps completed
                  </button>
                  <button
                    onClick={handleBreakDown}
                    disabled={breaking}
                    title="Regenerate the breakdown"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-brand-600 disabled:opacity-60"
                  >
                    {breaking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {breaking ? 'Working...' : 'Regenerate'}
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      progress === 100 ? 'bg-emerald-500' : 'bg-brand-500',
                    )}
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                  />
                </div>

                {/* Checklist */}
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.ul
                      key="subtasks"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="mt-3 space-y-1.5 overflow-hidden"
                    >
                      {subtasks.map((s) => {
                        const sd = subtaskDone(s);
                        const mins = formatMinutes(s.estimatedMinutes);
                        return (
                          <li key={s.id} className="flex items-center gap-2.5">
                            <button
                              onClick={() => onToggleSubtask?.(task.id, s.id)}
                              aria-label={sd ? 'Mark step incomplete' : 'Mark step complete'}
                              className={cn(
                                'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                                sd
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-slate-300 hover:border-brand-400',
                              )}
                            >
                              {sd && <Check className="h-3 w-3" />}
                            </button>
                            <span
                              className={cn(
                                'flex-1 text-sm',
                                sd ? 'text-slate-400 line-through' : 'text-slate-600',
                              )}
                            >
                              {s.title}
                            </span>
                            {mins && (
                              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                                ~{mins}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/*
 * Memoized: TaskCard renders in a list and its parent (Tasks page) re-renders
 * whenever ANY task changes. With stable, useCallback-backed onToggle /
 * onToggleSubtask handlers from AppContext, React.memo means only the card whose
 * `task` reference actually changed re-renders - the rest stay put.
 */
export default memo(TaskCard);
