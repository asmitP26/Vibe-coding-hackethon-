/*
 * copilotBrain - the context-aware reasoning layer behind the Productivity Copilot.
 *
 * Given a free-text message + the FULL app context (tasks, habits, schedule
 * blocks, productivity stats, and the current time) it:
 *   1. detects a fine-grained conversational intent, and
 *   2. builds a normalized, deterministic response:
 *        { intent, reply, cards: AssistantCard[] }
 *
 * This runs 100% offline and is the source of truth for the structured CARDS
 * the chat UI renders (they visualize the user's REAL data, so they must be
 * computed locally - never hallucinated). The natural-language `reply` produced
 * here is also the guaranteed fallback used when the Gemini backend is offline
 * or running without an API key (mock mode). When a key IS configured, the
 * backend upgrades only the `reply` text - the cards always stay accurate.
 *
 * Supported intents (each maps to the scenarios in the product spec):
 *   - now        : "What should I do now?"      -> current block + top task + next action
 *   - feasibility: "Can I finish everything today?" -> verdict + time-vs-effort + risks
 *   - time_box   : "I only have 2 hours"        -> best tasks for the window + mini plan
 *   - energy     : "I am tired"                 -> low-effort tasks + rest/light-work nudge
 *   - insights   : "What am I doing wrong?"     -> behavioral analysis + changes to make
 *   - chat       : anything else                -> top priorities + a helpful nudge
 */
import { sortTasksByPriority, resolveScore, resolveRisk } from './taskEngine';
import { isOverdue, sameDay, relativeDeadline } from '../utils/dateUtils';

export const COPILOT_INTENTS = {
  NOW: 'now',
  FEASIBILITY: 'feasibility',
  TIME_BOX: 'time_box',
  ENERGY: 'energy',
  INSIGHTS: 'insights',
  CHAT: 'chat',
};

// The working day is assumed to end at 22:00 (matches the daily-planner default).
const DAY_END_HOUR = 22;

// ============================================================================
// Small, dependency-free helpers.
// ============================================================================
const asArray = (value) => (Array.isArray(value) ? value : []);
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const activeTasks = (tasks) => asArray(tasks).filter((t) => t && t.status !== 'completed');
const effortOf = (task) => Math.max(0.25, Number(task?.estimatedEffort) || 0.5);

const pad = (n) => String(n).padStart(2, '0');
/** Decimal hours (e.g. 9.5) -> 24h "HH:MM" used by schedule cards. */
const fmtHour = (h) => `${pad(Math.floor(h))}:${pad(Math.round((h - Math.floor(h)) * 60))}`;

/** Current local time as decimal hours, from an optional ISO/Date input. */
function nowDecimal(currentTime) {
  const d = currentTime ? new Date(currentTime) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  return safe.getHours() + safe.getMinutes() / 60;
}

/** A short human label for an hours value: 0.5 -> "30m", 2 -> "2h", 1.5 -> "1h 30m". */
function hoursLabel(hours) {
  const total = Math.round((Number(hours) || 0) * 60);
  if (total <= 0) return '0m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const EMOJIS = ['\u{1F680}', '\u{1F9E0}', '\u26A1', '\u{1F4CC}', '\u{1F525}', '\u2705'];

/** Build a recommendations-card item list from a set of tasks. */
function tasksToRecommendations(tasks, detailFor) {
  return tasks.map((task, i) => {
    const tone = resolveRisk(task);
    return {
      id: task.id || `rec-${i + 1}`,
      emoji: EMOJIS[i] ?? '\u2705',
      title: task.title,
      detail: detailFor ? detailFor(task, tone) : task.aiReason || '',
      tone,
    };
  });
}

/** Build a risks-card item list (critical/high first) from active tasks. */
function tasksToRisks(tasks, limit = 4) {
  return activeTasks(tasks)
    .filter((t) => ['critical', 'high', 'attention'].includes(resolveRisk(t)))
    .sort((a, b) => resolveScore(b) - resolveScore(a))
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      title: t.title,
      tone: resolveRisk(t),
      detail: t.aiReason || '',
      deadline: t.deadline || null,
    }));
}

// ============================================================================
// Intent detection - keyword rules, ordered most-specific first.
// ============================================================================
export function detectCopilotIntent(message = '') {
  const t = String(message).toLowerCase().trim();

  if (/can i (finish|complete|get|do)|finish everything|everything today|all .*today|enough time|realistic|on track to finish|make it (all )?today/.test(t)) {
    return COPILOT_INTENTS.FEASIBILITY;
  }
  if (/only have|i have (only )?\d|just \d|\d+\s*(hour|hr|min|minute)|half an hour|spare (an|a) ?hour|free for|short on time|limited time|squeeze/.test(t)) {
    return COPILOT_INTENTS.TIME_BOX;
  }
  if (/tired|exhausted|burn(t|ed) out|burnout|no energy|low energy|drained|sleepy|can'?t focus|overwhelmed|stressed/.test(t)) {
    return COPILOT_INTENTS.ENERGY;
  }
  if (/doing wrong|what.*wrong|going wrong|am i (failing|struggling)|why am i|keep falling behind|bad habit|productivity (insight|analysis|review)|how am i doing|analy[sz]e my/.test(t)) {
    return COPILOT_INTENTS.INSIGHTS;
  }
  if (/what (should|do) i|should i (do|start|work|focus)|do (right )?now|next best action|best action|next action|what now|where (do i|should i|to) start|focus on/.test(t)) {
    return COPILOT_INTENTS.NOW;
  }
  return COPILOT_INTENTS.CHAT;
}

// ============================================================================
// Time-budget parsing (for "I only have 2 hours").
// ============================================================================
function parseBudgetHours(message, fallback = 2) {
  const t = String(message).toLowerCase();
  const minMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)\b/);
  if (minMatch) return Math.max(0.25, round1(parseFloat(minMatch[1]) / 60));
  const hrMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs|h)\b/);
  if (hrMatch) return Math.max(0.25, parseFloat(hrMatch[1]));
  if (/half an hour|half hour|30 ?min/.test(t)) return 0.5;
  if (/an hour|one hour/.test(t)) return 1;
  return fallback;
}

// ============================================================================
// Per-intent builders -> each returns { intent, reply, cards }.
// ============================================================================

/**
 * "What should I do now?" -> a short, natural answer with ONE clear next action,
 * why it matters, and an estimated time. No cards - a simple answer is enough.
 */
function buildNow(message, ctx) {
  const ranked = sortTasksByPriority(activeTasks(ctx.tasks));
  const top = ranked[0] || null;

  if (!top) {
    return {
      intent: COPILOT_INTENTS.NOW,
      reply:
        "You're all clear right now - nothing urgent on your plate. Take a breather, or pick one small win while you have the space \u{1F60C}",
      cards: [],
    };
  }

  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const withStop = (s) => (/[.!?]$/.test(String(s).trim()) ? String(s).trim() : `${String(s).trim()}.`);

  const reason = top.aiReason
    ? withStop(cap(top.aiReason))
    : top.deadline
      ? `It's your most time-sensitive deadline (${relativeDeadline(top.deadline)}).`
      : "It's the highest-impact thing on your list right now.";
  const time = hoursLabel(effortOf(top));
  const step = withStop(lower(top.nextBestAction || 'start with the hardest part first'));

  const reply =
    `Focus on "${top.title}" next. ${reason} It should take about ${time}. ` +
    `Next step: ${step}`;

  return { intent: COPILOT_INTENTS.NOW, reply, cards: [] };
}

/** "Can I finish everything today?" -> feasibility verdict, time-vs-effort, at-risk tasks. */
function buildFeasibility(message, ctx) {
  const nowDec = nowDecimal(ctx.currentTime);
  const active = activeTasks(ctx.tasks);
  const today = active.filter(
    (t) => t.status === 'in-progress' || (t.deadline && (isOverdue(t.deadline) || sameDay(t.deadline, new Date()))),
  );
  const pool = today.length ? today : active;

  const requiredHours = round1(pool.reduce((sum, t) => sum + effortOf(t), 0));
  const availableHours = round1(Math.max(0, DAY_END_HOUR - nowDec));

  let verdict = 'achievable';
  if (requiredHours > availableHours * 1.3) verdict = 'at-risk';
  else if (requiredHours > availableHours) verdict = 'tight';

  const headline = verdict === 'achievable'
    ? 'Yes - this is doable'
    : verdict === 'tight'
      ? 'Tight, but possible'
      : "Not all of it - let's protect what matters";
  const detail = `About ${hoursLabel(requiredHours)} of work vs ~${hoursLabel(availableHours)} of focus time left today.`;

  const atRisk = tasksToRisks(pool, 4);
  const items = sortTasksByPriority(pool)
    .slice(0, 6)
    .map((t) => ({ title: t.title, hours: round1(effortOf(t)), tone: resolveRisk(t) }));

  const note = verdict === 'achievable'
    ? 'Knock out the highest-risk item first and the rest will flow.'
    : verdict === 'tight'
      ? 'Start with the critical work now; defer anything low-importance if you slip.'
      : `You're ~${hoursLabel(Math.max(0, round1(requiredHours - availableHours)))} short - move the lowest-priority tasks to tomorrow.`;

  const cards = [
    {
      type: 'feasibility',
      verdict,
      title: 'Can you finish today?',
      headline,
      detail,
      stats: [
        { label: 'Time left', value: hoursLabel(availableHours) },
        { label: 'Work left', value: hoursLabel(requiredHours) },
        { label: 'Tasks', value: String(pool.length) },
      ],
    },
    {
      type: 'timeBreakdown',
      title: 'Time vs effort',
      availableHours,
      requiredHours,
      items,
      note,
    },
  ];
  if (atRisk.length) cards.push({ type: 'risks', items: atRisk });

  return {
    intent: COPILOT_INTENTS.FEASIBILITY,
    reply: "Here's an honest look at whether today is realistic \u{1F447}",
    cards,
  };
}

/** "I only have 2 hours" -> best tasks for the window + an optimized mini plan. */
function buildTimeBox(message, ctx) {
  const budget = parseBudgetHours(message, 2);
  const nowDec = nowDecimal(ctx.currentTime);
  const ranked = sortTasksByPriority(activeTasks(ctx.tasks));

  const picked = [];
  let used = 0;
  for (const task of ranked) {
    const eff = effortOf(task);
    if (used + eff <= budget + 0.001) {
      picked.push(task);
      used = round1(used + eff);
    }
    if (used >= budget) break;
  }
  if (!picked.length && ranked.length) picked.push(ranked[0]);

  // Build a back-to-back mini schedule starting now, capped at the budget.
  let cursor = Math.min(nowDec, DAY_END_HOUR - budget < 0 ? nowDec : nowDec);
  let remaining = budget;
  const blocks = [];
  picked.forEach((task, i) => {
    const dur = Math.min(effortOf(task), remaining);
    if (dur <= 0) return;
    blocks.push({
      id: `box-${task.id}`,
      taskId: task.id,
      title: task.title,
      start: fmtHour(cursor),
      end: fmtHour(cursor + dur),
      type: i === 0 ? 'focus' : 'work',
    });
    cursor = round1(cursor + dur);
    remaining = round1(remaining - dur);
  });

  const items = picked.map((t) => ({ title: t.title, hours: round1(effortOf(t)), tone: resolveRisk(t) }));
  const label = hoursLabel(budget);

  return {
    intent: COPILOT_INTENTS.TIME_BOX,
    reply: `Locked in - here's the best use of your ${label} \u{1F447}`,
    cards: [
      {
        type: 'timeBreakdown',
        title: `Best picks for ${label}`,
        availableHours: budget,
        requiredHours: round1(used),
        items,
        note: picked.length
          ? `Fits ${picked.length} task${picked.length > 1 ? 's' : ''} into your window, highest-impact first.`
          : 'No tasks small enough for that window - take a quick win or a break.',
      },
      ...(blocks.length
        ? [{ type: 'schedule', title: `Your ${label} mini plan`, summary: `${hoursLabel(used)} of focused work`, blocks }]
        : []),
    ],
  };
}

/** "I am tired" -> low-effort tasks + a rest / light-work suggestion. */
function buildEnergy(message, ctx) {
  const active = activeTasks(ctx.tasks);
  const lowEffort = active
    .slice()
    .sort((a, b) => effortOf(a) - effortOf(b))
    .filter((t) => effortOf(t) <= 1.25)
    .slice(0, 4);
  const pick = lowEffort[0] || sortTasksByPriority(active)[0] || null;

  const hasCritical = active.some((t) => resolveRisk(t) === 'critical');
  const action = hasCritical
    ? `Low on fuel but one deadline is critical - give it 15 focused minutes, then rest.`
    : pick
      ? `Do just one light thing - "${pick.title}" (~${hoursLabel(effortOf(pick))}) - then step away and recharge.`
      : 'Nothing urgent is pending. Close the laptop and properly rest - you have earned it.';

  const cards = [{ type: 'action', title: 'Go easy on yourself', detail: action }];
  if (lowEffort.length) {
    cards.push({
      type: 'recommendations',
      items: tasksToRecommendations(lowEffort, (t) => `Low effort (~${hoursLabel(effortOf(t))}) - easy to finish while tired.`),
    });
  }

  return {
    intent: COPILOT_INTENTS.ENERGY,
    reply: "Totally fair - let's keep it light. Here's what I'd do \u{1F447}",
    cards,
  };
}

/** "What am I doing wrong?" -> behavioral analysis (insights) + changes to make. */
function buildInsights(message, ctx) {
  const stats = ctx.productivityStats || {};
  const habits = asArray(ctx.habits);
  const active = activeTasks(ctx.tasks);

  const completionRate = Number(stats.completionRate) || 0;
  const productivityScore = Number(stats.productivityScore) || 0;
  const missedDeadlines = Number(stats.missedDeadlines) || 0;
  const topStreak = habits.reduce((max, h) => Math.max(max, Number(h.streak) || 0), 0);
  const highRisk = active.filter((t) => ['critical', 'high'].includes(resolveRisk(t))).length;
  const overdue = active.filter((t) => t.deadline && isOverdue(t.deadline)).length;

  const working = [];
  if (completionRate >= 70) working.push(`${completionRate}% completion rate - you finish what you start`);
  if (topStreak >= 5) working.push(`${topStreak}-day habit streak shows real consistency`);
  if (productivityScore >= 75) working.push(`Productivity score of ${productivityScore} is strong`);
  if (!working.length) working.push('You keep showing up - the consistency is there to build on');

  const improve = [];
  if (missedDeadlines > 0) improve.push(`${missedDeadlines} missed deadline${missedDeadlines > 1 ? 's' : ''} recently - plan a buffer before due times`);
  if (highRisk > 1) improve.push(`${highRisk} high-risk tasks are bunched together - spread them earlier`);
  if (overdue > 0) improve.push(`${overdue} task${overdue > 1 ? 's are' : ' is'} already overdue - reschedule ${overdue > 1 ? 'them' : 'it'} first`);
  if (completionRate < 70) improve.push('Completion rate is under 70% - try committing to fewer tasks per day');
  if (!improve.length) improve.push('Nothing major - keep protecting your focus blocks');

  const detail = highRisk > 1 || missedDeadlines > 0
    ? 'The pattern: you deliver, but high-stakes work clusters near deadlines. Pull your hardest task earlier in the day to defuse the crunch.'
    : "You're in good shape - your main risk is complacency. Keep one focused block sacred each day.";

  const cards = [
    { type: 'insights', title: 'What the data shows', working, improve, detail },
  ];
  const changes = sortTasksByPriority(active)
    .filter((t) => ['critical', 'high'].includes(resolveRisk(t)))
    .slice(0, 3);
  if (changes.length) {
    cards.push({
      type: 'recommendations',
      items: tasksToRecommendations(changes, (t) => `Pull this earlier - ${t.aiReason || 'it carries the most deadline risk.'}`),
    });
  }

  return {
    intent: COPILOT_INTENTS.INSIGHTS,
    reply: "Here's what your data is quietly telling you \u{1F447}",
    cards,
  };
}

/** Anything else -> surface the current top priorities with a helpful nudge. */
function buildChat(message, ctx) {
  const ranked = sortTasksByPriority(activeTasks(ctx.tasks)).slice(0, 3);
  const cards = ranked.length
    ? [{
        type: 'recommendations',
        items: tasksToRecommendations(ranked, (t, tone) => t.aiReason || `${tone === 'safe' ? 'On track' : 'Needs attention'} - keep it moving.`),
      }]
    : [];
  return {
    intent: COPILOT_INTENTS.CHAT,
    reply: ranked.length
      ? "Here's what stands out across your tasks right now \u{1F447}"
      : "You're all caught up - add a task and I'll help you prioritize it.",
    cards,
  };
}

const BUILDERS = {
  [COPILOT_INTENTS.NOW]: buildNow,
  [COPILOT_INTENTS.FEASIBILITY]: buildFeasibility,
  [COPILOT_INTENTS.TIME_BOX]: buildTimeBox,
  [COPILOT_INTENTS.ENERGY]: buildEnergy,
  [COPILOT_INTENTS.INSIGHTS]: buildInsights,
  [COPILOT_INTENTS.CHAT]: buildChat,
};

/**
 * Build the full deterministic Copilot response for a message + context.
 * @param {string} message  The user's free-text message.
 * @param {object} ctx      { tasks, habits, scheduleBlocks, productivityStats, currentTime }
 * @returns {{ intent: string, reply: string, cards: object[] }}
 */
export function buildCopilotResponse(message, ctx = {}) {
  const intent = detectCopilotIntent(message);
  const builder = BUILDERS[intent] || buildChat;
  try {
    const res = builder(message, ctx);
    return { intent: res.intent, reply: res.reply, cards: asArray(res.cards) };
  } catch {
    // Never throw - always return something the chat UI can render.
    return {
      intent: COPILOT_INTENTS.CHAT,
      reply: "Here's what I can see from your tasks right now \u{1F447}",
      cards: [],
    };
  }
}

export default buildCopilotResponse;
