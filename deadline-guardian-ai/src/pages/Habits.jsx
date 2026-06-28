import { Flame, Check, Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader';
import Card, { CardHeader } from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { getHabitColor } from '../utils/uiMeta';
import { weekdayShort, getWeekDays } from '../utils/dateUtils';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { cn } from '../lib/cn';

export default function Habits() {
  const { habits, toggleHabit, dailyGoals } = useApp();
  const weekDays = getWeekDays();
  // Guard every aggregate against the "no habits" edge case so we never render
  // NaN% (divide-by-zero) or -Infinity (Math.max on an empty array).
  const habitList = Array.isArray(habits) ? habits : [];
  const goalList = Array.isArray(dailyGoals) ? dailyGoals : [];
  const hasHabits = habitList.length > 0;
  const completedToday = habitList.filter((h) => h?.completedToday).length;
  const avgWeekly = hasHabits
    ? Math.round(
        (habitList.reduce((sum, h) => sum + (h?.weekly?.filter(Boolean).length || 0), 0) /
          (habitList.length * 7)) *
          100,
      )
    : 0;
  const bestStreak = hasHabits ? Math.max(...habitList.map((h) => Number(h?.streak) || 0)) : 0;

  return (
    <div>
      <PageHeader title="Goals & Habits" subtitle="Build the routines that keep deadlines stress-free." />

      {/* Top stats */}
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-slate-500">Completed today</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {completedToday}/{habitList.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500">Weekly consistency</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{avgWeekly}%</p>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-slate-500">Best streak</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {bestStreak} days
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Habit cards */}
        {!hasHabits ? (
          <div className="lg:col-span-2">
            <EmptyState
              icon={Flame}
              title="No habits yet"
              description="Add a habit to start building streaks that keep your deadlines stress-free."
            />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2"
          >
            {habitList.map((h) => {
              const c = getHabitColor(h.color);
              return (
                <Card key={h.id} hover variants={fadeInUp}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn('grid h-11 w-11 place-items-center rounded-2xl text-xl', c.soft)}>
                        {h.emoji}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{h.name}</p>
                        <p className={cn('text-xs font-medium', c.text)}>
                          <Flame className="mr-0.5 inline h-3 w-3" />
                          {h.streak} day streak
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleHabit(h.id)}
                      aria-label={`Toggle ${h.name}`}
                      className={cn(
                        'grid h-8 w-8 place-items-center rounded-xl border-2 transition-colors',
                        h.completedToday
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 hover:border-brand-400',
                      )}
                    >
                      {h.completedToday && <Check className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* weekly dots */}
                  <div className="mt-4 flex items-center justify-between">
                    {(h.weekly || []).map((done, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-400">{weekdayShort(weekDays[i])}</span>
                        <span
                          className={cn(
                            'grid h-7 w-7 place-items-center rounded-lg text-white',
                            done ? c.bar : 'bg-slate-100',
                          )}
                        >
                          {done ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </motion.div>
        )}

        {/* Daily goals */}
        <Card>
          <CardHeader icon={Target} title="Daily Goals" subtitle="Today's progress" iconClass="bg-indigo-50 text-indigo-600" />
          <ul className="space-y-4">
            {goalList.map((g) => (
              <li key={g.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{g.title}</span>
                  <span className="text-xs font-bold text-slate-900">{g.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
            <TrendingUp className="h-4 w-4" />
            You're trending ahead of last week. Keep it up!
          </div>
        </Card>
      </div>
    </div>
  );
}
