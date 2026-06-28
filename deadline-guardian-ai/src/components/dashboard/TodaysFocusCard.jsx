import { Target, Clock } from 'lucide-react';
import Card, { CardHeader } from '../common/Card';
import { useApp } from '../../context/AppContext';
import { sortTasksByPriority, resolveRisk } from '../../services/taskEngine';
import { getRiskMeta } from '../../utils/uiMeta';
import { relativeDeadline } from '../../utils/dateUtils';
import { cn } from '../../lib/cn';

/** Today's Focus - the single most important task to do right now. */
export default function TodaysFocusCard() {
  const { tasks } = useApp();
  const focus = sortTasksByPriority(tasks).find((t) => t.status !== 'completed');

  return (
    <Card hover>
      <CardHeader
        icon={Target}
        title="Today's Focus"
        subtitle="Your single most important task"
        iconClass="bg-indigo-50 text-indigo-600"
      />
      {focus ? (
        <div>
          <p className="text-lg font-bold text-slate-900">{focus.title}</p>
          {focus.aiReason && <p className="mt-1.5 text-sm text-slate-500">{focus.aiReason}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {(() => {
              const risk = getRiskMeta(resolveRisk(focus));
              return (
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold', risk.badge)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', risk.dot)} />
                  {risk.label}
                </span>
              );
            })()}
            <span className="inline-flex items-center gap-1 font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5" /> {relativeDeadline(focus.deadline)}
            </span>
            <span className="font-medium text-slate-400">~{focus.estimatedEffort}h</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">All caught up. Time to get ahead!</p>
      )}
    </Card>
  );
}
