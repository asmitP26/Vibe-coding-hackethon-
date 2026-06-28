import { Flame, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader } from '../common/Card';
import Badge from '../common/Badge';
import { useApp } from '../../context/AppContext';
import { sortTasksByPriority, resolveScore, resolveRisk } from '../../services/taskEngine';
import { getRiskMeta } from '../../utils/uiMeta';
import { relativeDeadline } from '../../utils/dateUtils';
import { cn } from '../../lib/cn';

/** Top Priority Tasks - the ranked shortlist. */
export default function TopPriorityTasks() {
  const { tasks, toggleTask } = useApp();
  const navigate = useNavigate();
  const top = sortTasksByPriority(tasks)
    .filter((t) => t.status !== 'completed')
    .slice(0, 4);

  return (
    <Card>
      <CardHeader
        icon={Flame}
        title="Top Priority Tasks"
        subtitle="Ranked by deadline & impact"
        iconClass="bg-orange-50 text-orange-600"
        action={
          <button
            onClick={() => navigate('/tasks')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View all <ChevronRight className="h-4 w-4" />
          </button>
        }
      />
      {top.length === 0 ? (
        <p className="text-sm text-slate-500">No open tasks. You're all caught up!</p>
      ) : (
        <ul className="space-y-2.5">
          {top.map((task) => {
            const risk = getRiskMeta(resolveRisk(task));
            return (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition-colors hover:border-slate-200"
            >
              <button
                onClick={() => toggleTask(task.id)}
                aria-label="Mark complete"
                className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-slate-300 text-white transition-colors hover:border-brand-400"
              >
                <Check className="h-3 w-3 opacity-0" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className={risk.badge} dot={risk.dot}>
                    {risk.label}
                  </Badge>
                  <span className="text-xs text-slate-400">{relativeDeadline(task.deadline)}</span>
                </div>
              </div>
              <span className={cn('rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700')}>
                {resolveScore(task)}
              </span>
            </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
