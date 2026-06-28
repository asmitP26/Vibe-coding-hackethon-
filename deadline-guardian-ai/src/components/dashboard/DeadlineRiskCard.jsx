import { AlertTriangle } from 'lucide-react';
import Card, { CardHeader } from '../common/Card';
import { useApp } from '../../context/AppContext';
import { resolveRisk, resolveScore, sortTasksByPriority } from '../../services/taskEngine';
import { getRiskMeta } from '../../utils/uiMeta';
import { relativeDeadline } from '../../utils/dateUtils';
import { cn } from '../../lib/cn';

const RISK_ORDER = { critical: 0, high: 1, attention: 2, safe: 3 };

/** Deadline Risk - tasks most likely to slip. */
export default function DeadlineRiskCard() {
  const { tasks } = useApp();
  const atRisk = sortTasksByPriority(tasks)
    .filter((t) => t.status !== 'completed' && ['critical', 'high', 'attention'].includes(resolveRisk(t)))
    .sort((a, b) => RISK_ORDER[resolveRisk(a)] - RISK_ORDER[resolveRisk(b)])
    .slice(0, 4);

  return (
    <Card>
      <CardHeader
        icon={AlertTriangle}
        title="Smart Alerts"
        subtitle={`${atRisk.length} need attention`}
        iconClass="bg-red-50 text-red-600"
      />
      {atRisk.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing at risk. Nicely on track.</p>
      ) : (
        <ul className="space-y-3">
          {atRisk.map((task) => {
            const risk = getRiskMeta(resolveRisk(task));
            return (
              <li key={task.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-slate-700">{task.title}</p>
                  <span className={cn('shrink-0 text-xs font-semibold', risk.text)}>
                    {risk.label}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full', risk.bar)}
                      style={{ width: `${resolveScore(task)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[11px] text-slate-400">
                    {relativeDeadline(task.deadline)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
