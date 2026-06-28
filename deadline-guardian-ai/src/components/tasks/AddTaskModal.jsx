import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Sparkles, Loader2, Calendar, Clock, Flag, Tag, FileText } from 'lucide-react';
import Button from '../common/Button';
import AIModeBadge from '../common/AIModeBadge';
import { useApp } from '../../context/AppContext';
import { analyzeTask, getAIMode } from '../../services/geminiService';
import { calculatePriorityScore, getRiskLevel } from '../../services/taskEngine';
import { cn } from '../../lib/cn';

const IMPORTANCE = [
  { label: 'Low', value: 2 },
  { label: 'Medium', value: 3 },
  { label: 'High', value: 5 },
];

const CATEGORIES = ['Inbox', 'Hackathon', 'Career', 'Study', 'Personal', 'Work', 'Health'];

const EMPTY = {
  title: '',
  description: '',
  deadline: '',
  estimatedEffort: 1,
  importance: 3,
  category: 'Inbox',
};

/**
 * AddTaskModal - collects task details, then enriches the task with
 * geminiService.analyzeTask() (live Gemini or the offline mock) before saving
 * it to global state. Shows an "AI is analyzing..." state during the call and
 * falls back to the local task engine if the AI layer ever throws.
 */
export default function AddTaskModal({ open, onClose }) {
  const { addTaskWithAnalysis, showToast } = useApp();
  const [form, setForm] = useState(EMPTY);
  const [analyzing, setAnalyzing] = useState(false);
  const titleRef = useRef(null);
  const live = getAIMode() === 'live';

  // Reset the form and focus the title each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setAnalyzing(false);
    const t = setTimeout(() => titleRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // Close on Escape (unless mid-analysis).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !analyzing) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, analyzing, onClose]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const title = form.title.trim();
    if (!title || analyzing) return;

    const draft = {
      title,
      description: form.description.trim(),
      deadline: form.deadline ? form.deadline : null,
      estimatedEffort: Number(form.estimatedEffort) || 1,
      importance: Number(form.importance) || 3,
      category: form.category || 'Inbox',
      status: 'todo',
    };

    setAnalyzing(true);
    try {
      // analyzeTask never throws by design (it falls back to mock internally),
      // but we still guard so the UI can never break.
      const analysis = await analyzeTask(draft);
      addTaskWithAnalysis(draft, analysis);
      showToast(
        live ? 'Task analyzed with Gemini ✓' : 'Task added with Mock AI',
        live ? 'success' : 'info',
      );
    } catch (err) {
      // Defensive fallback: prioritize locally with the deterministic engine.
      console.warn('[AddTaskModal] AI analysis failed - using local fallback.', err);
      addTaskWithAnalysis(draft, {
        priorityScore: calculatePriorityScore(draft),
        riskLevel: getRiskLevel(draft),
        reason: 'Prioritized locally while the AI assistant was unavailable.',
        suggestedSubtasks: [],
      });
      showToast('Gemini was unavailable - added with local analysis instead.', 'warning');
    } finally {
      setAnalyzing(false);
      onClose?.();
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => !analyzing && onClose?.()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-task-title"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onMouseDown={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-card sm:rounded-3xl sm:p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-500 text-white shadow-glow">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="add-task-title" className="text-base font-bold text-slate-900">
                    Add a task
                  </h2>
                  <p className="text-xs text-slate-500">AI will prioritize and break it down.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AIModeBadge />
                <button
                  onClick={() => !analyzing && onClose?.()}
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label htmlFor="task-title" className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Title
                </label>
                <input
                  id="task-title"
                  ref={titleRef}
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="What needs to get done?"
                  maxLength={140}
                  required
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="task-desc" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <FileText className="h-3.5 w-3.5" /> Description
                </label>
                <textarea
                  id="task-desc"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Add any helpful details (optional)"
                  maxLength={500}
                  rows={2}
                  className="input resize-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="task-deadline" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Calendar className="h-3.5 w-3.5" /> Deadline
                  </label>
                  <input
                    id="task-deadline"
                    type="datetime-local"
                    value={form.deadline}
                    onChange={(e) => update('deadline', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="task-effort" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Clock className="h-3.5 w-3.5" /> Estimated hours
                  </label>
                  <input
                    id="task-effort"
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={form.estimatedEffort}
                    onChange={(e) => update('estimatedEffort', e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Flag className="h-3.5 w-3.5" /> Importance
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
                    {IMPORTANCE.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update('importance', opt.value)}
                        className={cn(
                          'rounded-lg py-1.5 text-xs font-semibold transition-colors',
                          form.importance === opt.value
                            ? 'bg-white text-brand-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="task-category" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Tag className="h-3.5 w-3.5" /> Category
                  </label>
                  <select
                    id="task-category"
                    value={form.category}
                    onChange={(e) => update('category', e.target.value)}
                    className="input"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-1 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => !analyzing && onClose?.()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!form.title.trim() || analyzing}>
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Add task
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Analyzing overlay */}
            <AnimatePresence>
              {analyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-white/85 backdrop-blur-sm"
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <span className="relative grid h-14 w-14 place-items-center">
                      <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/30" />
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-white shadow-glow">
                        <Sparkles className="h-6 w-6" />
                      </span>
                    </span>
                    <p className="text-sm font-semibold text-slate-900">AI is analyzing your task...</p>
                    <p className="max-w-[16rem] text-xs text-slate-500">
                      {live
                        ? 'Asking Gemini to score priority, assess risk, and break it down.'
                        : 'Running the built-in productivity engine to prioritize it.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
