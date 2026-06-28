/*
 * Presentation metadata mapping domain values -> Tailwind class strings.
 * Class strings are written out in full (no dynamic interpolation) so the
 * Tailwind compiler can detect and keep them.
 */

export const RISK_META = {
  critical: {
    label: 'Critical',
    badge: 'bg-red-50 text-red-600 ring-1 ring-red-100',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    text: 'text-red-600',
    soft: 'bg-red-50',
  },
  high: {
    label: 'At Risk',
    badge: 'bg-orange-50 text-orange-600 ring-1 ring-orange-100',
    dot: 'bg-orange-500',
    bar: 'bg-orange-500',
    text: 'text-orange-600',
    soft: 'bg-orange-50',
  },
  attention: {
    label: 'Needs Attention',
    badge: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    dot: 'bg-amber-500',
    bar: 'bg-amber-400',
    text: 'text-amber-600',
    soft: 'bg-amber-50',
  },
  safe: {
    label: 'On Track',
    badge: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    text: 'text-emerald-600',
    soft: 'bg-emerald-50',
  },
};

export function getRiskMeta(level) {
  return RISK_META[level] || RISK_META.safe;
}

export const STATUS_META = {
  todo: { label: 'To Do', badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  'in-progress': { label: 'In Progress', badge: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100' },
  completed: { label: 'Completed', badge: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' },
};

export function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.todo;
}

/* Schedule block types -> colors used by the Planner timeline. */
export const BLOCK_META = {
  focus: { label: 'Focus', dot: 'bg-brand-500', chip: 'bg-brand-50 text-brand-700', bar: 'bg-brand-500', text: 'text-brand-600', border: 'border-brand-500' },
  work: { label: 'Work', dot: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700', bar: 'bg-indigo-500', text: 'text-indigo-600', border: 'border-indigo-500' },
  habit: { label: 'Habit', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500' },
  meeting: { label: 'Meeting', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500' },
  break: { label: 'Break', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400', text: 'text-slate-500', border: 'border-slate-400' },
};

export function getBlockMeta(type) {
  return BLOCK_META[type] || BLOCK_META.work;
}

/* Habit accent colors (full class strings per Tailwind safelisting). */
export const HABIT_COLORS = {
  blue: { soft: 'bg-brand-50', text: 'text-brand-600', bar: 'bg-brand-500', ring: 'ring-brand-100' },
  indigo: { soft: 'bg-indigo-50', text: 'text-indigo-600', bar: 'bg-indigo-500', ring: 'ring-indigo-100' },
  emerald: { soft: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', ring: 'ring-emerald-100' },
  violet: { soft: 'bg-violet-50', text: 'text-violet-600', bar: 'bg-violet-500', ring: 'ring-violet-100' },
};

export function getHabitColor(color) {
  return HABIT_COLORS[color] || HABIT_COLORS.blue;
}
