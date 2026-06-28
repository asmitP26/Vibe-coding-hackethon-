import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { getGreeting, weekdayLong, formatShortDate } from '../utils/dateUtils';
import ErrorBoundary from '../components/common/ErrorBoundary';
import DailyBriefCard from '../components/dashboard/DailyBriefCard';
import TodaysFocusCard from '../components/dashboard/TodaysFocusCard';
import QuickAddTask from '../components/dashboard/QuickAddTask';
import TopPriorityTasks from '../components/dashboard/TopPriorityTasks';
import DeadlineRiskCard from '../components/dashboard/DeadlineRiskCard';
import ProductivityScoreCard from '../components/dashboard/ProductivityScoreCard';
import CalendarPreviewCard from '../components/dashboard/CalendarPreviewCard';
import HabitTrackerWidget from '../components/dashboard/HabitTrackerWidget';
import RecommendationsCard from '../components/dashboard/RecommendationsCard';

/**
 * Wrap a widget in a motion cell + isolated ErrorBoundary so one crash stays
 * contained. Each cell drives its OWN explicit entrance animation rather than
 * relying on a parent variant orchestration: under rapid navigation the parent
 * stagger could be interrupted and leave widgets stuck at opacity 0 (a blank
 * dashboard). With an explicit per-widget `animate`, every cell independently
 * settles at opacity 1 and is never left invisible.
 */
function Widget({ label, className, index = 0, children }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(index * 0.05, 0.4) }}
    >
      <ErrorBoundary label={label}>{children}</ErrorBoundary>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useApp();
  const firstName = user?.firstName || user?.name || 'there';
  const now = new Date();

  return (
    <div>
      <div className="relative mb-6">
        <div
          aria-hidden="true"
          className="animate-glow pointer-events-none absolute -left-8 -top-12 -z-0 h-44 w-80 rounded-full bg-gradient-to-br from-brand-400/25 via-indigo-400/20 to-violet-400/25 blur-3xl"
        />
        <div className="relative">
          <p className="text-sm font-medium text-brand-600">
            {weekdayLong(now)}, {formatShortDate(now)}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {getGreeting()}, <span className="text-gradient">{firstName}</span> 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here's your AI command center. Let's finish before the deadlines.
          </p>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Widget label="Daily Brief" index={0} className="lg:col-span-2">
          <DailyBriefCard />
        </Widget>
        <Widget label="Calendar" index={1} className="lg:row-span-2">
          <CalendarPreviewCard />
        </Widget>

        <Widget label="Today's Focus" index={2}>
          <TodaysFocusCard />
        </Widget>
        <Widget label="Productivity Score" index={3}>
          <ProductivityScoreCard />
        </Widget>

        <Widget label="Quick Add" index={4} className="lg:col-span-2">
          <QuickAddTask />
        </Widget>
        <Widget label="Deadline Risk" index={5}>
          <DeadlineRiskCard />
        </Widget>

        <Widget label="Top Priority Tasks" index={6}>
          <TopPriorityTasks />
        </Widget>
        <Widget label="Habit Tracker" index={7}>
          <HabitTrackerWidget />
        </Widget>
        <Widget label="Recommendations" index={8}>
          <RecommendationsCard />
        </Widget>
      </div>
    </div>
  );
}
