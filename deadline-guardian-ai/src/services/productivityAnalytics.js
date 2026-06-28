/*
 * productivityAnalytics.js
 * --------------------------------------------------------------------------
 * A pure, deterministic analytics layer that turns raw app state (live tasks,
 * schedule blocks, weekly stats, habits) into *meaningful intelligence*:
 * completion rate, missed-task ratio, average delay, most productive time of
 * day, most ignored category, human-readable insight sentences, and a weekly
 * report.
 *
 * Design rules:
 *  - Never throws. Every input is guarded (Array.isArray / Number coercion) so
 *    the Insights page can render even with partial or empty data.
 *  - No React / no side effects - safe to call inside useMemo.
 *  - Class strings / icons are NOT decided here; the page owns presentation.
 *    We only emit lightweight `iconKey` + `tone` hints.
 */

import { isOverdue } from '../utils/dateUtils';

const MS_PER_HOUR = 1000 * 60 * 60;

/** Time-of-day buckets used to find the user's most productive window. */
const DAYPARTS = [
  { part: 'Morning', label: '8AM\u201311AM', from: 5, to: 12 },
  { part: 'Afternoon', label: '1PM\u20134PM', from: 12, to: 17 },
  { part: 'Evening', label: '6PM\u20139PM', from: 17, to: 22 },
  { part: 'Night', label: '9PM\u201312AM', from: 22, to: 5 },
];

/** Relative "deep work" weight per schedule block type. */
const BLOCK_WEIGHT = { focus: 1, work: 0.8, habit: 0.5, meeting: 0.4, break: 0 };

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isCompleted(task) {
  return task && task.status === 'completed';
}

function effortOf(task) {
  return num(task && task.estimatedEffort, 1) || 1;
}

/** Parse "HH:MM" -> hours as a float (e.g. "09:30" -> 9.5). Safe on bad input. */
function parseClock(value) {
  if (typeof value !== 'string') return null;
  const [h, m] = value.split(':');
  const hours = num(h, NaN);
  const mins = num(m, 0);
  if (!Number.isFinite(hours)) return null;
  return hours + mins / 60;
}

/** Format an integer hour (0-23) as a friendly clock label e.g. 18 -> "6PM". */
function hourLabel(hour) {
  const h = ((Math.round(hour) % 24) + 24) % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
}

/** Turn an average delay in hours into a compact human label. */
function formatDelay(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return 'On time';
  if (hours < 1) return '< 1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)} days`;
}

/**
 * Find the most productive window by bucketing focus/work schedule blocks into
 * dayparts (weighted by block type) and picking the heaviest bucket. We also
 * derive a *real* window label from the actual blocks in the winning bucket so
 * the message reflects the user's data rather than a fixed range.
 */
function computeProductiveWindow(blocks) {
  const totals = DAYPARTS.map((dp) => ({ ...dp, hours: 0, minStart: null, maxEnd: null }));

  blocks.forEach((block) => {
    const start = parseClock(block && block.start);
    const end = parseClock(block && block.end);
    if (start == null || end == null || end <= start) return;
    const weight = BLOCK_WEIGHT[block.type] ?? 0.6;
    if (weight <= 0) return;
    const duration = end - start;
    const hour = Math.floor(start);
    const bucket = totals.find((dp) =>
      dp.from < dp.to ? hour >= dp.from && hour < dp.to : hour >= dp.from || hour < dp.to,
    );
    if (!bucket) return;
    bucket.hours += duration * weight;
    bucket.minStart = bucket.minStart == null ? start : Math.min(bucket.minStart, start);
    bucket.maxEnd = bucket.maxEnd == null ? end : Math.max(bucket.maxEnd, end);
  });

  const best = totals.reduce((a, b) => (b.hours > a.hours ? b : a), totals[0]);
  if (!best || best.hours <= 0) {
    return { part: 'Evening', label: '6PM\u20139PM', hours: 0, hasData: false };
  }
  const label =
    best.minStart != null && best.maxEnd != null
      ? `${hourLabel(best.minStart)}\u2013${hourLabel(best.maxEnd)}`
      : best.label;
  return { part: best.part, label, hours: Math.round(best.hours * 10) / 10, hasData: true };
}

/**
 * Group tasks by category and surface the "most ignored" one - the category
 * carrying the most open + overdue weight (i.e. work that keeps slipping).
 */
function computeIgnoredCategory(tasks) {
  const groups = new Map();
  tasks.forEach((task) => {
    const name = (task && task.category) || 'Uncategorized';
    const entry = groups.get(name) || { name, total: 0, open: 0, overdue: 0 };
    entry.total += 1;
    if (!isCompleted(task)) {
      entry.open += 1;
      if (task.deadline && isOverdue(task.deadline)) entry.overdue += 1;
    }
    groups.set(name, entry);
  });

  const list = [...groups.values()];
  if (!list.length) return null;
  // Ignore score weights overdue work heavily, then open work.
  const ranked = list
    .map((g) => ({ ...g, ignoreScore: g.overdue * 2 + g.open }))
    .sort((a, b) => b.ignoreScore - a.ignoreScore || b.overdue - a.overdue);
  const top = ranked[0];
  if (top.ignoreScore <= 0) return null;
  return { name: top.name, openCount: top.open, overdueCount: top.overdue };
}

/** Build the weekly report from the 7-day trend (with graceful fallbacks). */
function computeWeekly(stats) {
  const trend = Array.isArray(stats.trend) ? stats.trend : [];
  const days = trend.map((d) => ({
    day: String((d && d.day) ?? ''),
    score: num(d && d.score),
    completed: num(d && d.completed),
  }));

  if (!days.length) {
    return {
      days: [],
      totalCompleted: num(stats.tasksCompleted),
      avgScore: num(stats.productivityScore),
      bestDay: null,
      toughestDay: null,
      focusHours: num(stats.focusHours),
      deltaScore: 0,
      momentum: 'steady',
      maxCompleted: 0,
      summary: 'Not enough data yet - complete a few tasks to unlock your weekly report.',
    };
  }

  const totalCompleted = days.reduce((sum, d) => sum + d.completed, 0);
  const avgScore = Math.round(days.reduce((sum, d) => sum + d.score, 0) / days.length);
  const bestDay = days.reduce((a, b) => (b.score > a.score ? b : a), days[0]);
  const toughestDay = days.reduce((a, b) => (b.score < a.score ? b : a), days[0]);
  const deltaScore = days[days.length - 1].score - days[0].score;
  const momentum = deltaScore > 4 ? 'up' : deltaScore < -4 ? 'down' : 'steady';
  const maxCompleted = days.reduce((m, d) => Math.max(m, d.completed), 0);

  const trendWord =
    momentum === 'up' ? 'climbing' : momentum === 'down' ? 'cooling off' : 'holding steady';
  const summary =
    `Over the past 7 days you completed ${totalCompleted} tasks with an average score of ` +
    `${avgScore}. ${bestDay.day} was your peak (${bestDay.score}), while ${toughestDay.day} ` +
    `dipped to ${toughestDay.score}. Your momentum is ${trendWord}.`;

  return {
    days,
    totalCompleted,
    avgScore,
    bestDay,
    toughestDay,
    focusHours: num(stats.focusHours),
    deltaScore,
    momentum,
    maxCompleted,
    summary,
  };
}

/**
 * Main entry point. Returns { metrics, insights, weekly } - everything the
 * Insights page needs to render meaningful, personalized analysis.
 */
export function computeProductivityAnalytics({
  tasks = [],
  scheduleBlocks = [],
  productivityStats = {},
} = {}) {
  const taskList = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  const blocks = Array.isArray(scheduleBlocks) ? scheduleBlocks.filter(Boolean) : [];
  const stats = productivityStats && typeof productivityStats === 'object' ? productivityStats : {};

  const totalCount = taskList.length;
  const completedCount = taskList.filter(isCompleted).length;
  const openCount = totalCount - completedCount;
  const overdueTasks = taskList.filter(
    (t) => !isCompleted(t) && t.deadline && isOverdue(t.deadline),
  );
  const overdueCount = overdueTasks.length;

  // Completion rate: prefer live signal once the user has completed anything;
  // otherwise fall back to the seeded baseline so the demo stays meaningful.
  const liveCompletion = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const hasLiveCompletions = completedCount > 0;
  const completionRate = hasLiveCompletions
    ? liveCompletion
    : num(stats.completionRate, liveCompletion);

  const missedRatio = totalCount ? Math.round((overdueCount / totalCount) * 100) : 0;

  // Average delay across overdue, incomplete tasks (how late they are now).
  const delays = overdueTasks.map((t) => (Date.now() - new Date(t.deadline).getTime()) / MS_PER_HOUR);
  const averageDelayHours = delays.length
    ? delays.reduce((a, b) => a + b, 0) / delays.length
    : 0;

  const productiveWindow = computeProductiveWindow(blocks);
  const ignoredCategory = computeIgnoredCategory(taskList);

  // Do delays cluster around longer or shorter tasks?
  const avgEffortAll = totalCount
    ? taskList.reduce((sum, t) => sum + effortOf(t), 0) / totalCount
    : 0;
  const avgEffortOverdue = overdueCount
    ? overdueTasks.reduce((sum, t) => sum + effortOf(t), 0) / overdueCount
    : 0;
  let delayPattern = 'even';
  if (overdueCount && avgEffortAll > 0) {
    if (avgEffortOverdue > avgEffortAll * 1.15) delayPattern = 'long';
    else if (avgEffortOverdue < avgEffortAll * 0.85) delayPattern = 'short';
  }

  const productivityScore = num(stats.productivityScore);

  const metrics = {
    totalCount,
    completedCount,
    openCount,
    overdueCount,
    completionRate,
    completionSource: hasLiveCompletions ? 'live' : 'baseline',
    missedRatio,
    averageDelayHours: Math.round(averageDelayHours * 10) / 10,
    averageDelayLabel: formatDelay(averageDelayHours),
    productivityScore,
    productiveWindow,
    ignoredCategory,
  };

  const weekly = computeWeekly(stats);

  // ---- Human-readable insight sentences -----------------------------------
  const insights = [];

  insights.push({
    id: 'completion',
    iconKey: 'check',
    tone: completionRate >= 75 ? 'safe' : completionRate >= 50 ? 'attention' : 'high',
    text: `You complete ${completionRate}% of planned tasks`,
  });

  if (productiveWindow.hasData) {
    insights.push({
      id: 'window',
      iconKey: 'clock',
      tone: 'brand',
      text: `You are most productive in the ${productiveWindow.part.toLowerCase()} (${productiveWindow.label})`,
    });
  }

  if (delayPattern === 'long') {
    insights.push({
      id: 'delay-pattern',
      iconKey: 'hourglass',
      tone: 'attention',
      text: 'You tend to delay long, high-effort tasks',
    });
  } else if (delayPattern === 'short') {
    insights.push({
      id: 'delay-pattern',
      iconKey: 'hourglass',
      tone: 'attention',
      text: 'Quick tasks tend to slip - knock them out as they arrive',
    });
  }

  if (overdueCount > 0) {
    insights.push({
      id: 'avg-delay',
      iconKey: 'calendar',
      tone: missedRatio >= 40 ? 'high' : 'attention',
      text: `${overdueCount} task${overdueCount > 1 ? 's are' : ' is'} overdue, running ${metrics.averageDelayLabel} late on average`,
    });
  } else {
    insights.push({
      id: 'avg-delay',
      iconKey: 'calendar',
      tone: 'safe',
      text: 'No overdue tasks right now - your deadlines are under control',
    });
  }

  if (ignoredCategory) {
    insights.push({
      id: 'ignored',
      iconKey: 'folder',
      tone: ignoredCategory.overdueCount > 0 ? 'high' : 'attention',
      text: `${ignoredCategory.name} is your most ignored category (${ignoredCategory.openCount} open${ignoredCategory.overdueCount ? `, ${ignoredCategory.overdueCount} overdue` : ''})`,
    });
  }

  if (weekly.momentum === 'up') {
    insights.push({
      id: 'momentum',
      iconKey: 'trend',
      tone: 'safe',
      text: `Your weekly score is climbing (+${weekly.deltaScore} since ${weekly.days[0]?.day || 'last week'})`,
    });
  } else if (weekly.momentum === 'down') {
    insights.push({
      id: 'momentum',
      iconKey: 'trend',
      tone: 'high',
      text: `Your weekly score dipped ${weekly.deltaScore} points - ease back in with a small win`,
    });
  }

  return { metrics, insights, weekly };
}

export default computeProductivityAnalytics;
