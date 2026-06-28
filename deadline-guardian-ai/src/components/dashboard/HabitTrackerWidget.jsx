import { Flame, Check } from 'lucide-react';
import Card, { CardHeader } from '../common/Card';
import { useApp } from '../../context/AppContext';
import { getHabitColor } from '../../utils/uiMeta';
import { cn } from '../../lib/cn';

/** Compact habit tracker widget for the dashboard. */
export default function HabitTrackerWidget() {
  const { habits, toggleHabit } = useApp();
  const habitList = Array.isArray(habits) ? habits : [];
  const done = habitList.filter((h) => h?.completedToday).length;

  return (
    <Card>
      <CardHeader
        icon={Flame}
        title="Habit Tracker"
        subtitle={`${done}/${habitList.length} done today`}
        iconClass="bg-emerald-50 text-emerald-600"
      />
      {habitList.length === 0 ? (
        <p className="text-sm text-slate-500">No habits yet. Add one to start a streak.</p>
      ) : (
        <ul className="space-y-2.5">
          {habitList.map((h) => {
            const c = getHabitColor(h.color);
            return (
              <li key={h.id} className="flex items-center gap-3">
                <span className={cn('grid h-9 w-9 place-items-center rounded-xl text-base', c.soft)}>
                  {h.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{h.name}</p>
                  <p className={cn('text-xs font-medium', c.text)}>
                    <Flame className="mr-0.5 inline h-3 w-3" />
                    {h.streak} day streak
                  </p>
                </div>
                <button
                  onClick={() => toggleHabit(h.id)}
                  aria-label={`Toggle ${h.name}`}
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-lg border-2 transition-colors',
                    h.completedToday
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 hover:border-brand-400',
                  )}
                >
                  {h.completedToday && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
