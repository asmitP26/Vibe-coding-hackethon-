import { Lightbulb, Target, AlertTriangle, CalendarClock, ListChecks, Clock, ArrowRight, Compass, Hourglass, CheckCircle2, TrendingUp, Check } from 'lucide-react';
import Badge from '../common/Badge';
import { getRiskMeta, getBlockMeta } from '../../utils/uiMeta';
import { formatDeadline, relativeDeadline } from '../../utils/dateUtils';
import { cn } from '../../lib/cn';

/** 30 -> "30m", 90 -> "1h 30m". */
function formatMinutes(min) {
  const m = Math.round(Number(min) || 0);
  if (m <= 0) return '';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

/** 0.5 -> "30m", 2 -> "2h", 1.5 -> "1h 30m". */
function formatHours(hours) {
  const total = Math.round((Number(hours) || 0) * 60);
  if (total <= 0) return '0m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const SHELL = 'rounded-2xl border p-3';

function CardTitle({ icon: Icon, children, className }) {
  return (
    <div className={cn('flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide', className)}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

/** Next best action highlight. */
function ActionCard({ card }) {
  return (
    <div className={cn(SHELL, 'border-indigo-100 bg-indigo-50/60')}>
      <CardTitle icon={Target} className="text-indigo-700">
        {card.title || 'Next best action'}
      </CardTitle>
      <p className="mt-1 text-sm text-slate-700">{card.detail}</p>
    </div>
  );
}

/** AI recommendations list. */
function RecommendationsCard({ card }) {
  const items = card.items || [];
  return (
    <div className={cn(SHELL, 'border-slate-100 bg-white')}>
      <CardTitle icon={Lightbulb} className="text-brand-600">Recommendations</CardTitle>
      <ul className="mt-2 space-y-2">
        {items.map((it) => {
          const meta = getRiskMeta(it.tone);
          return (
            <li key={it.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 text-base leading-none">{it.emoji || '✅'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                  <p className="text-sm font-semibold text-slate-800">{it.title}</p>
                </div>
                {it.detail && <p className="mt-0.5 text-xs text-slate-500">{it.detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Risk warnings list. */
function RisksCard({ card }) {
  const items = card.items || [];
  return (
    <div className={cn(SHELL, 'border-red-100 bg-red-50/40')}>
      <CardTitle icon={AlertTriangle} className="text-red-600">Deadline risks</CardTitle>
      <ul className="mt-2 space-y-2">
        {items.map((it) => {
          const meta = getRiskMeta(it.tone);
          return (
            <li key={it.id} className="rounded-xl bg-white/70 p-2.5 ring-1 ring-red-50">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-800">{it.title}</p>
                <Badge className={meta.badge} dot={meta.dot}>{meta.label}</Badge>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clock className="h-3 w-3" />
                {formatDeadline(it.deadline)}
                {it.deadline && <span className="text-slate-400">· {relativeDeadline(it.deadline)}</span>}
              </div>
              {it.detail && <p className="mt-1 text-xs text-slate-500">{it.detail}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Schedule suggestion (daily plan). */
function ScheduleCard({ card }) {
  const blocks = card.blocks || [];
  return (
    <div className={cn(SHELL, 'border-brand-100 bg-brand-50/40')}>
      <CardTitle icon={CalendarClock} className="text-brand-600">{card.title || 'Schedule'}</CardTitle>
      {card.summary && <p className="mt-1 text-xs text-slate-500">{card.summary}</p>}
      <ul className="mt-2 space-y-1.5">
        {blocks.map((b) => {
          const meta = getBlockMeta(b.type);
          return (
            <li key={b.id} className="flex items-center gap-2.5 rounded-xl bg-white/70 px-2.5 py-1.5 ring-1 ring-brand-50">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
              <span className="w-[78px] shrink-0 text-xs font-semibold text-slate-700">
                {b.start}–{b.end}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{b.title}</span>
              <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium', meta.chip)}>
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Reschedule suggestions (with per-item reason). */
function RescheduleCard({ card }) {
  const items = card.items || [];
  return (
    <div className={cn(SHELL, 'border-amber-100 bg-amber-50/40')}>
      <CardTitle icon={CalendarClock} className="text-amber-600">{card.title || 'Suggested new times'}</CardTitle>
      <ul className="mt-2 space-y-2">
        {items.map((it, i) => (
          <li key={it.taskId || i} className="rounded-xl bg-white/70 p-2.5 ring-1 ring-amber-50">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-800">{it.title}</p>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                {it.newStart}
                <ArrowRight className="h-3 w-3" />
                {it.newEnd}
              </span>
            </div>
            {it.reason && <p className="mt-1 text-xs text-slate-500">{it.reason}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Task breakdown checklist (read-only preview). */
function BreakdownCard({ card }) {
  const subtasks = card.subtasks || [];
  return (
    <div className={cn(SHELL, 'border-slate-100 bg-white')}>
      <CardTitle icon={ListChecks} className="text-brand-600">
        Breakdown · {card.title}
      </CardTitle>
      <ol className="mt-2 space-y-1.5">
        {subtasks.map((s, i) => {
          const mins = formatMinutes(s.estimatedMinutes);
          return (
            <li key={i} className="flex items-center gap-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm text-slate-600">{s.title}</span>
              {mins && <span className="shrink-0 text-[11px] font-medium text-slate-400">~{mins}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** "What should I do now?" - current/next block + top task + next action. */
function FocusCard({ card }) {
  const { block, task, action } = card;
  const taskMeta = task ? getRiskMeta(task.tone) : null;
  const blockMeta = block ? getBlockMeta(block.type) : null;
  return (
    <div className={cn(SHELL, 'border-indigo-100 bg-indigo-50/50')}>
      <CardTitle icon={Compass} className="text-indigo-700">{card.title || 'Right now'}</CardTitle>
      <div className="mt-2 space-y-2">
        {block && (
          <div className="flex items-center gap-2 rounded-xl bg-white/70 px-2.5 py-1.5 ring-1 ring-indigo-50">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', blockMeta.dot)} />
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {block.when === 'now' ? 'Now' : 'Next'}
            </span>
            <span className="shrink-0 text-xs font-semibold text-slate-700">{block.start}–{block.end}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{block.title}</span>
          </div>
        )}
        {task && (
          <div className="rounded-xl bg-white/70 p-2.5 ring-1 ring-indigo-50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Top priority</span>
              <Badge className={taskMeta.badge} dot={taskMeta.dot}>{taskMeta.label}</Badge>
            </div>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{task.title}</p>
            {task.deadline && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clock className="h-3 w-3" />
                {formatDeadline(task.deadline)}
                <span className="text-slate-400">· {relativeDeadline(task.deadline)}</span>
              </div>
            )}
          </div>
        )}
        {action && (
          <div className="flex items-start gap-1.5 rounded-xl bg-indigo-500/5 px-2.5 py-2">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-indigo-700">Next: </span>{action}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Time vs effort breakdown - available capacity vs required hours + per-task rows. */
function TimeBreakdownCard({ card }) {
  const items = card.items || [];
  const available = Math.max(0, Number(card.availableHours) || 0);
  const required = Math.max(0, Number(card.requiredHours) || 0);
  const over = available > 0 && required > available;
  const pct = available > 0 ? Math.min(100, Math.round((required / available) * 100)) : 100;
  const barColor = over ? 'bg-red-500' : required >= available * 0.85 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className={cn(SHELL, 'border-slate-100 bg-white')}>
      <CardTitle icon={Hourglass} className="text-slate-600">{card.title || 'Time vs effort'}</CardTitle>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">Need {formatHours(required)}</span>
        <span className={cn('font-semibold', over ? 'text-red-600' : 'text-emerald-600')}>
          Have {formatHours(available)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
      {items.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {items.map((it, i) => {
            const meta = getRiskMeta(it.tone);
            return (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />
                <span className="min-w-0 flex-1 truncate text-slate-600">{it.title}</span>
                <span className="shrink-0 text-[11px] font-semibold text-slate-400">{formatHours(it.hours)}</span>
              </li>
            );
          })}
        </ul>
      )}
      {card.note && <p className="mt-2 text-xs text-slate-500">{card.note}</p>}
    </div>
  );
}

const FEASIBILITY_META = {
  achievable: { icon: CheckCircle2, shell: 'border-emerald-100 bg-emerald-50/50', text: 'text-emerald-700' },
  tight: { icon: Clock, shell: 'border-amber-100 bg-amber-50/50', text: 'text-amber-700' },
  'at-risk': { icon: AlertTriangle, shell: 'border-red-100 bg-red-50/50', text: 'text-red-700' },
};

/** Feasibility verdict - "Can I finish everything today?". */
function FeasibilityCard({ card }) {
  const meta = FEASIBILITY_META[card.verdict] || FEASIBILITY_META.tight;
  const stats = card.stats || [];
  return (
    <div className={cn(SHELL, meta.shell)}>
      <CardTitle icon={meta.icon} className={meta.text}>{card.title || 'Can you finish today?'}</CardTitle>
      <p className={cn('mt-1 text-sm font-bold', meta.text)}>{card.headline}</p>
      {card.detail && <p className="mt-0.5 text-xs text-slate-600">{card.detail}</p>}
      {stats.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {stats.map((s, i) => (
            <div key={i} className="rounded-xl bg-white/70 px-2 py-1.5 text-center ring-1 ring-black/5">
              <p className="text-sm font-bold text-slate-800">{s.value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Behavioral analysis - "What am I doing wrong?". */
function InsightsCard({ card }) {
  const working = card.working || [];
  const improve = card.improve || [];
  return (
    <div className={cn(SHELL, 'border-slate-100 bg-white')}>
      <CardTitle icon={TrendingUp} className="text-brand-600">{card.title || 'What the data shows'}</CardTitle>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50/60 p-2.5 ring-1 ring-emerald-100/60">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">What's working</p>
          <ul className="mt-1 space-y-1">
            {working.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                <span className="min-w-0">{w}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-amber-50/60 p-2.5 ring-1 ring-amber-100/60">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">What to change</p>
          <ul className="mt-1 space-y-1">
            {improve.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                <span className="min-w-0">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {card.detail && <p className="mt-2 text-xs text-slate-500">{card.detail}</p>}
    </div>
  );
}

const RENDERERS = {
  action: ActionCard,
  recommendations: RecommendationsCard,
  risks: RisksCard,
  schedule: ScheduleCard,
  reschedule: RescheduleCard,
  breakdown: BreakdownCard,
  focus: FocusCard,
  timeBreakdown: TimeBreakdownCard,
  feasibility: FeasibilityCard,
  insights: InsightsCard,
};

/**
 * Render the structured AI response cards attached to an assistant message.
 */
export default function AssistantResponseCards({ cards = [] }) {
  if (!cards.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {cards.map((card, i) => {
        const Renderer = RENDERERS[card.type];
        return Renderer ? <Renderer key={i} card={card} /> : null;
      })}
    </div>
  );
}
