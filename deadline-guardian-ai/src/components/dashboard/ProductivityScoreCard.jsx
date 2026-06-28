import { TrendingUp } from 'lucide-react';
import Card from '../common/Card';
import { useApp } from '../../context/AppContext';

/** Productivity Score - radial gauge with a small breakdown. */
export default function ProductivityScoreCard() {
  const { productivityStats } = useApp();
  const stats = productivityStats && typeof productivityStats === 'object' ? productivityStats : {};
  const score = Math.max(0, Math.min(100, Number(stats.productivityScore) || 0));

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  const items = [
    { label: 'Completion', value: `${stats.completionRate ?? 0}%` },
    { label: 'Focus hours', value: `${stats.focusHours ?? 0}h` },
    { label: 'Done', value: stats.tasksCompleted ?? 0 },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Productivity Score</h3>
          <p className="text-xs text-slate-500">This week</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
          <TrendingUp className="h-3.5 w-3.5" /> +8
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#eef2f7" strokeWidth="12" />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-3xl font-extrabold text-slate-900">{score}</p>
              <p className="text-[11px] text-slate-400">/ 100</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {items.map((i) => (
            <div key={i.label} className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{i.label}</span>
              <span className="text-sm font-bold text-slate-900">{i.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
