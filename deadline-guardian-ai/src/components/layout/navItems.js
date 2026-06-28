import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  Target,
  BarChart3,
  BellRing,
  Sparkles,
} from 'lucide-react';

export const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/planner', label: 'Planner', icon: CalendarDays },
  { to: '/habits', label: 'Goals & Habits', shortLabel: 'Habits', icon: Target },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/reminders', label: 'Reminders', icon: BellRing },
  { to: '/assistant', label: 'Assistant', icon: Sparkles },
];

// Mobile bottom bar keeps 5 items; the Assistant lives in the floating button
// and Reminders are reachable from the bell + sidebar.
export const mobileNavItems = navItems.filter(
  (item) => item.to !== '/assistant' && item.to !== '/reminders',
);
