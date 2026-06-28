import { useState } from 'react';
import { Sparkles, RefreshCw, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import { useApp } from '../context/AppContext';
import { generateDailyPlan, rescheduleTasks } from '../services/geminiService';
import { getBlockMeta } from '../utils/uiMeta';
import { getWeekDays, sameDay, weekdayShort } from '../utils/dateUtils';
import { cn } from '../lib/cn';

function MiniWeek() {
  const days = getWeekDays();
  const today = new Date();
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const isToday = sameDay(d, today);
        return (
          <div
            key={d.toISOString()}
            className={cn(
              'flex flex-col items-center rounded-xl px-1 py-2 text-center transition-colors',
              isToday ? 'bg-brand-600 text-white shadow-glow' : 'bg-slate-50 text-slate-600',
            )}
          >
            <span className={cn('text-[10px] font-medium', isToday ? 'text-white/80' : 'text-slate-400')}>
              {weekdayShort(d)}
            </span>
            <span className="text-sm font-bold">{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Planner() {
  const { scheduleBlocks, tasks } = useApp();
  const [blocks, setBlocks] = useState(() => (Array.isArray(scheduleBlocks) ? scheduleBlocks : []));
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [replanning, setReplanning] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const plan = await generateDailyPlan(tasks, { startHour: 9 });
      setBlocks(Array.isArray(plan?.blocks) ? plan.blocks : []);
      setSummary(typeof plan?.summary === 'string' ? plan.summary : '');
    } finally {
      setGenerating(false);
    }
  }

  async function handleReplan() {
    setReplanning(true);
    try {
      // Demo: treat overdue/at-risk tasks as "missed".
      const missedIds = tasks.filter((t) => t.riskLevel === 'critical').map((t) => t.id);
      const result = await rescheduleTasks(tasks, missedIds);
      setSummary(typeof result?.summary === 'string' ? result.summary : '');
    } finally {
      setReplanning(false);
    }
  }

  // Timeline spans 8:00 - 24:00.
  const dayStart = 8;
  const dayEnd = 24;
  const toMinutes = (t) => {
    if (typeof t !== 'string') return 0;
    const [h, m] = t.split(':').map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  const span = (dayEnd - dayStart) * 60;

  return (
    <div>
      <PageHeader title="Planner" subtitle="Your AI-generated day, time-blocked for deep focus.">
        <Button variant="secondary" onClick={handleReplan} disabled={replanning}>
          <RefreshCw className={cn('h-4 w-4', replanning && 'animate-spin')} />
          Auto-Replan Missed
        </Button>
        <Button onClick={handleGenerate} disabled={generating}>
          <Sparkles className={cn('h-4 w-4', generating && 'animate-pulse')} />
          {generating ? 'Generating...' : 'Generate AI Plan'}
        </Button>
      </PageHeader>

      {summary && (
        <Card className="mb-4 border-brand-100 bg-brand-50/60">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand-600">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="text-sm text-brand-900">{summary}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader icon={Clock} title="Today's Schedule" subtitle={`${blocks.length} blocks planned`} />
          <div className="relative" style={{ height: `${(dayEnd - dayStart) * 52}px` }}>
            {/* hour gridlines */}
            {Array.from({ length: dayEnd - dayStart + 1 }).map((_, i) => {
              const hour = dayStart + i;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-center gap-3"
                  style={{ top: `${(i / (dayEnd - dayStart)) * 100}%` }}
                >
                  <span className="w-10 shrink-0 text-right text-[11px] text-slate-400">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
              );
            })}

            {/* blocks */}
            <div className="absolute inset-y-0 left-14 right-0">
              {generating
                ? [
                    { top: 2, h: 16 },
                    { top: 22, h: 11 },
                    { top: 40, h: 13 },
                    { top: 58, h: 18 },
                    { top: 82, h: 14 },
                  ].map((s, i) => (
                    <Skeleton
                      key={i}
                      className="absolute left-0 right-2 border-l-4 border-slate-200 bg-slate-100/80 ring-1 ring-slate-100"
                      style={{ top: `${s.top}%`, height: `${s.h}%` }}
                    />
                  ))
                : blocks.map((b) => {
                    const meta = getBlockMeta(b.type);
                    const top = ((toMinutes(b.start) - dayStart * 60) / span) * 100;
                    const height = ((toMinutes(b.end) - toMinutes(b.start)) / span) * 100;
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          'absolute left-0 right-2 overflow-hidden rounded-xl border-l-4 bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-soft',
                          meta.border,
                        )}
                        style={{ top: `${top}%`, height: `${height}%` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
                          <p className="truncate text-sm font-semibold text-slate-800">{b.title}</p>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {b.start} - {b.end} · <span className={cn('font-medium', meta.text)}>{meta.label}</span>
                        </p>
                      </motion.div>
                    );
                  })}
              {!generating && blocks.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
                  <p className="text-sm font-medium text-slate-600">No blocks scheduled yet</p>
                  <p className="text-xs text-slate-400">Generate an AI plan to time-block your day.</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Side: mini week + legend */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="This Week" subtitle="Tap a day to view" />
            <MiniWeek />
          </Card>

          <Card>
            <p className="mb-3 text-sm font-semibold text-slate-900">Block types</p>
            <div className="flex flex-wrap gap-2">
              {['focus', 'work', 'habit', 'meeting', 'break'].map((type) => {
                const meta = getBlockMeta(type);
                return (
                  <Badge key={type} className={meta.chip} dot={meta.dot}>
                    {meta.label}
                  </Badge>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
