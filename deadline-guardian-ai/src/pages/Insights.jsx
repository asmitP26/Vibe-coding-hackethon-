import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  CheckCircle2,
  CalendarX,
  CalendarDays,
  AlertTriangle,
  Gauge,
  Lightbulb,
  TrendingUp,
  Clock,
  Hourglass,
  FolderOpen,
  Target,
  Award,
  Sparkles,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader';
import Card, { CardHeader } from '../components/common/Card';
import AIModeBadge from '../components/common/AIModeBadge';
import { useApp } from '../context/AppContext';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { computeProductivityAnalytics } from '../services/productivityAnalytics';
import { getProductivityCoaching } from '../services/geminiService';

const BAR_COLORS = ['#3b82f6', '#6366f1', '#22c55e', '#f59e0b'];

/* Tone -> full Tailwind class strings (written out for the compiler). */
const TONE = {
  safe: { soft: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', ring: 'ring-emerald-100' },
  attention: { soft: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-400', ring: 'ring-amber-100' },
  high: { soft: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500', ring: 'ring-orange-100' },
  critical: { soft: 'bg-red-50', text: 'text-red-600', bar: 'bg-red-500', ring: 'ring-red-100' },
  brand: { soft: 'bg-brand-50', text: 'text-brand-600', bar: 'bg-brand-500', ring: 'ring-brand-100' },
};
const toneOf = (tone) => TONE[tone] || TONE.brand;

/* SVG stroke colors for the progress ring (hex, not class). */
const RING_COLOR = { brand: '#3b82f6', safe: '#22c55e', attention: '#f59e0b', high: '#f97316', critical: '#ef4444' };

const INSIGHT_ICON = {
  check: CheckCircle2,
  clock: Clock,
  hourglass: Hourglass,
  calendar: CalendarDays,
  folder: FolderOpen,
  trend: TrendingUp,
  target: Target,
  alert: AlertTriangle,
};

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/* ------------------------------------------------------------------ */
/* Local presentational subcomponents                                  */
/* ------------------------------------------------------------------ */

function MetricCard({ icon: Icon, label, value, sub, tone = 'brand', progress = null }) {
  const t = toneOf(tone);
  return (
    <Card hover>
      <span className={`grid h-10 w-10 place-items-center rounded-2xl ${t.soft} ${t.text}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-3">
        {progress != null ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${clampPct(progress)}%` }} />
          </div>
        ) : null}
        {sub && <p className="mt-1.5 text-[11px] text-slate-400">{sub}</p>}
      </div>
    </Card>
  );
}

function ProgressRing({ value = 0, size = 104, stroke = 9, tone = 'brand', label = 'score' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = clampPct(value);
  const offset = circumference - (pct / 100) * circumference;
  const color = RING_COLOR[tone] || RING_COLOR.brand;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#eef2f7" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-extrabold text-slate-900">{pct}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function InsightRow({ insight }) {
  const Icon = INSIGHT_ICON[insight.iconKey] || Sparkles;
  const t = toneOf(insight.tone);
  return (
    <motion.li
      variants={fadeInUp}
      className={`flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ${t.ring}`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.soft} ${t.text}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="pt-1 text-sm font-medium text-slate-700">{insight.text}</p>
    </motion.li>
  );
}

function CoachList({ items, icon: Icon, tone }) {
  const t = toneOf(tone);
  if (!items || !items.length) {
    return <p className="text-sm text-slate-400">Nothing to show yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.text}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SkeletonLines({ rows = 3 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3.5 animate-pulse rounded-full bg-slate-100" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Insights() {
  const { tasks, scheduleBlocks, productivityStats } = useApp();
  const s = productivityStats;

  const { metrics, insights, weekly } = useMemo(
    () => computeProductivityAnalytics({ tasks, scheduleBlocks, productivityStats }),
    [tasks, scheduleBlocks, productivityStats],
  );

  const [coaching, setCoaching] = useState(null);
  const [loadingCoach, setLoadingCoach] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingCoach(true);
    getProductivityCoaching(productivityStats, tasks)
      .then((res) => {
        if (active) setCoaching(res);
      })
      .catch((err) => {
        // getProductivityCoaching falls back to a mock internally; this is a
        // final guard so a failure never throws or leaves the panel stuck.
        if (active) console.warn('[Insights] coaching unavailable - showing defaults.', err);
      })
      .finally(() => {
        if (active) setLoadingCoach(false);
      });
    return () => {
      active = false;
    };
  }, [productivityStats, tasks]);

  const completionTone =
    metrics.completionRate >= 75 ? 'safe' : metrics.completionRate >= 50 ? 'attention' : 'high';
  const missedTone = metrics.missedRatio <= 20 ? 'safe' : metrics.missedRatio <= 40 ? 'attention' : 'high';
  const scoreTone = metrics.productivityScore >= 75 ? 'safe' : metrics.productivityScore >= 50 ? 'attention' : 'high';
  const delayTone = metrics.overdueCount === 0 ? 'safe' : metrics.missedRatio >= 40 ? 'high' : 'attention';

  const MomentumIcon =
    weekly.momentum === 'up' ? ArrowUpRight : weekly.momentum === 'down' ? ArrowDownRight : Minus;
  const momentumTone = weekly.momentum === 'up' ? 'safe' : weekly.momentum === 'down' ? 'high' : 'attention';
  const momentumMeta = toneOf(momentumTone);

  return (
    <div>
      <PageHeader title="Insights" subtitle="Personalized analysis of how you actually work." />

      {/* Key metrics with progress indicators */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <motion.div variants={fadeInUp}>
          <MetricCard
            icon={Gauge}
            label="Completion rate"
            value={`${metrics.completionRate}%`}
            tone={completionTone}
            progress={metrics.completionRate}
            sub={metrics.completionSource === 'live' ? `${metrics.completedCount}/${metrics.totalCount} live tasks` : 'last 7 days'}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <MetricCard
            icon={CalendarX}
            label="Missed task ratio"
            value={`${metrics.missedRatio}%`}
            tone={missedTone}
            progress={metrics.missedRatio}
            sub={`${metrics.overdueCount} overdue of ${metrics.totalCount}`}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <MetricCard
            icon={Hourglass}
            label="Average delay"
            value={metrics.averageDelayLabel}
            tone={delayTone}
            sub={metrics.overdueCount ? `across ${metrics.overdueCount} overdue task${metrics.overdueCount > 1 ? 's' : ''}` : 'nothing overdue'}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <MetricCard
            icon={Award}
            label="Productivity score"
            value={metrics.productivityScore}
            tone={scoreTone}
            progress={metrics.productivityScore}
            sub="this week"
          />
        </motion.div>
      </motion.div>

      {/* Personalized insights + analytic highlights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={Sparkles}
            title="Personalized Insights"
            subtitle="What your patterns reveal"
            iconClass="bg-brand-50 text-brand-600"
          />
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid gap-2.5 sm:grid-cols-2"
          >
            {insights.map((insight) => (
              <InsightRow key={insight.id} insight={insight} />
            ))}
          </motion.ul>
        </Card>

        <Card>
          <CardHeader title="Highlights" subtitle="At a glance" />
          <div className="flex flex-col items-center gap-4">
            <ProgressRing value={metrics.productivityScore} tone={scoreTone} label="score" />
            <div className="w-full space-y-3">
              <div className={`flex items-center gap-3 rounded-2xl ${toneOf('brand').soft} p-3`}>
                <Clock className="h-5 w-5 shrink-0 text-brand-600" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Most productive</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {metrics.productiveWindow.part} &middot; {metrics.productiveWindow.label}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-3 rounded-2xl ${toneOf('attention').soft} p-3`}>
                <FolderOpen className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Most ignored</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {metrics.ignoredCategory ? `${metrics.ignoredCategory.name} (${metrics.ignoredCategory.openCount} open)` : 'All categories on track'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* AI coaching */}
      <Card className="mt-4">
        <CardHeader
          icon={Lightbulb}
          title="AI Coaching"
          subtitle={loadingCoach ? 'Analyzing your productivity\u2026' : (coaching?.summary || 'Strengths, focus areas and recommendations')}
          iconClass="bg-amber-50 text-amber-600"
          action={<AIModeBadge />}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100">
            <div className="mb-2.5 flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Strengths</h3>
            </div>
            {loadingCoach ? <SkeletonLines rows={2} /> : <CoachList items={coaching?.strengths} icon={CheckCircle2} tone="safe" />}
          </div>

          <div className="rounded-2xl bg-amber-50/60 p-4 ring-1 ring-amber-100">
            <div className="mb-2.5 flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-800">Focus areas</h3>
            </div>
            {loadingCoach ? <SkeletonLines rows={2} /> : <CoachList items={coaching?.improvements} icon={AlertTriangle} tone="attention" />}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2.5 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-800">Recommendations</h3>
          </div>
          {loadingCoach ? (
            <SkeletonLines rows={3} />
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {(coaching?.recommendations || []).map((rec) => {
                const t = toneOf(rec.tone);
                return (
                  <li key={rec.id} className={`flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ${t.ring}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.soft} text-lg`}>
                      {rec.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{rec.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{rec.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {!loadingCoach && coaching?.focusRecommendation && (
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-brand-50/70 p-3 text-sm text-brand-900">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>{coaching.focusRecommendation}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Weekly report */}
      <Card className="mt-4">
        <CardHeader
          icon={CalendarDays}
          title="Weekly Report"
          subtitle="Your past 7 days"
          iconClass="bg-indigo-50 text-indigo-600"
          action={
            <span className={`inline-flex items-center gap-1 rounded-full ${momentumMeta.soft} px-2.5 py-1 text-xs font-semibold ${momentumMeta.text}`}>
              <MomentumIcon className="h-3.5 w-3.5" />
              {weekly.momentum === 'up' ? 'Trending up' : weekly.momentum === 'down' ? 'Cooling off' : 'Steady'}
            </span>
          }
        />

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-xl font-extrabold text-slate-900">{weekly.totalCompleted}</p>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">Tasks completed</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-brand-600">
              <Gauge className="h-4 w-4" />
              <p className="text-xl font-extrabold text-slate-900">{weekly.avgScore}</p>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">Avg score</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-amber-600">
              <TrendingUp className="h-4 w-4" />
              <p className="text-base font-extrabold text-slate-900">{weekly.bestDay ? weekly.bestDay.day : '\u2014'}</p>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Best day{weekly.bestDay ? ` (${weekly.bestDay.score})` : ''}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-indigo-600">
              <Flame className="h-4 w-4" />
              <p className="text-xl font-extrabold text-slate-900">{weekly.focusHours}h</p>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">Focus hours</p>
          </div>
        </div>

        {weekly.days.length > 0 && (
          <div className="mb-4 flex items-end justify-between gap-2">
            {weekly.days.map((d) => {
              const h = weekly.maxCompleted ? Math.round((d.completed / weekly.maxCompleted) * 100) : 0;
              const isBest = weekly.bestDay && d.day === weekly.bestDay.day;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-24 w-full items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(h, 6)}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-5 rounded-lg ${isBest ? 'bg-brand-500' : 'bg-brand-200'}`}
                      title={`${d.completed} completed`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">{d.day}</span>
                </div>
              );
            })}
          </div>
        )}

        <p className="rounded-2xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">{weekly.summary}</p>
      </Card>

      {/* Supporting charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={TrendingUp} title="Productivity Trend" subtitle="Daily score over the week" />
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 30px -12px rgba(2,6,23,0.2)',
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} fill="url(#trendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="By Category" subtitle="Completed tasks" />
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.byCategory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {s.byCategory.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
