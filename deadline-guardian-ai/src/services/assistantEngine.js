/*
 * assistantEngine - the routing brain behind the Productivity Copilot.
 *
 * Given a user message + the current app context (tasks, habits, schedule,
 * stats), it decides which Gemini agent to call and normalizes every result
 * into a single response shape the chat UI can render:
 *
 *   { kind, content, cards: AssistantCard[], mode }
 *
 * Each gemini agent falls back to a deterministic mock internally, so this
 * module keeps working with no API key. The one purely-local route is "risks",
 * which summarizes high-risk tasks with the offline task engine.
 */
import {
  generateDailyPlan,
  breakDownTask,
  rescheduleTasks,
  getAIMode,
  chatWithCopilot,
} from './geminiService';
import { buildCopilotResponse } from './copilotBrain';
import { sortTasksByPriority, resolveRisk, resolveScore } from './taskEngine';
import { isOverdue } from '../utils/dateUtils';

export const INTENTS = {
  PLAN: 'plan',
  BREAKDOWN: 'breakdown',
  RESCHEDULE: 'reschedule',
  RISKS: 'risks',
  CHAT: 'chat',
};

/**
 * Map a free-text message to a STRUCTURED route. The four structured intents
 * (plan / breakdown / reschedule / risks) have dedicated card builders. Anything
 * else returns CHAT and is handled by the context-aware Copilot brain, which
 * does its own fine-grained intent detection (now / feasibility / time-box /
 * energy / insights / chat).
 */
export function detectIntent(text = '') {
  const t = String(text).toLowerCase().trim();
  if (/\b(plan|schedule|organi[sz]e)\b.*\b(day|today|morning|afternoon|evening)\b/.test(t)) {
    return INTENTS.PLAN;
  }
  if (/break\s*(it|my|the|this)?\s*down|break down|biggest task|sub-?tasks?/.test(t)) {
    return INTENTS.BREAKDOWN;
  }
  if (/resched|re-?plan\b|missed task|catch up|fell behind|behind schedule/.test(t)) {
    return INTENTS.RESCHEDULE;
  }
  if (/\brisks?\b|at risk|deadline risk|overdue|what.*due/.test(t)) {
    return INTENTS.RISKS;
  }
  return INTENTS.CHAT;
}

const activeTasks = (tasks = []) => tasks.filter((t) => t.status !== 'completed');
const toMinutes = (hours) => {
  const m = Math.round((Number(hours) || 0) * 60);
  return m > 0 ? m : 30;
};

async function planDay(ctx) {
  const plan = await generateDailyPlan(ctx.tasks, { startHour: 9, endHour: 22 });
  const blocks = Array.isArray(plan?.blocks) ? plan.blocks : [];
  return {
    kind: INTENTS.PLAN,
    content: plan?.summary || 'Here is a focused plan for your day.',
    cards: blocks.length
      ? [{
          type: 'schedule',
          title: 'Your plan for today',
          summary: plan?.focusHours ? `${plan.focusHours}h of focused work planned` : null,
          blocks,
        }]
      : [],
  };
}

/** Trim the live context to a small, safe payload for the backend Gemini call. */
function buildContextPayload(ctx, currentTime) {
  return {
    currentTime,
    tasks: activeTasks(ctx.tasks).slice(0, 20).map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline ?? null,
      estimatedEffort: t.estimatedEffort ?? null,
      importance: t.importance ?? null,
      status: t.status ?? 'todo',
      riskLevel: resolveRisk(t),
      priorityScore: resolveScore(t),
    })),
    habits: (Array.isArray(ctx.habits) ? ctx.habits : []).slice(0, 12).map((h) => ({
      name: h.name,
      streak: h.streak ?? 0,
      completedToday: !!h.completedToday,
    })),
    scheduleBlocks: (Array.isArray(ctx.scheduleBlocks) ? ctx.scheduleBlocks : []).slice(0, 12).map((b) => ({
      title: b.title,
      start: b.start,
      end: b.end,
      type: b.type,
    })),
    productivityStats: {
      completionRate: ctx.productivityStats?.completionRate ?? null,
      productivityScore: ctx.productivityStats?.productivityScore ?? null,
      missedDeadlines: ctx.productivityStats?.missedDeadlines ?? null,
      highRiskTasks: ctx.productivityStats?.highRiskTasks ?? null,
    },
  };
}

/**
 * Context-aware conversational route. The copilotBrain builds the structured
 * cards locally from live data; the backend (Gemini, when configured) upgrades
 * only the reply text. Recent history (ctx.history) gives the AI short-term
 * memory of the last few interactions.
 */
async function copilotChat(message, ctx) {
  const currentTime = new Date().toISOString();
  const local = buildCopilotResponse(message, {
    tasks: ctx.tasks,
    habits: ctx.habits,
    scheduleBlocks: ctx.scheduleBlocks,
    productivityStats: ctx.productivityStats,
    currentTime,
  });
  const reply = await chatWithCopilot(
    {
      message,
      context: buildContextPayload(ctx, currentTime),
      history: Array.isArray(ctx.history) ? ctx.history : [],
      intent: local.intent,
    },
    local.reply,
  );
  return { kind: local.intent, content: reply, cards: local.cards };
}

async function breakdownBiggest(ctx) {
  const ranked = sortTasksByPriority(activeTasks(ctx.tasks));
  const biggest = ranked[0];
  if (!biggest) {
    return { kind: INTENTS.BREAKDOWN, content: "You're all clear - no active tasks to break down right now.", cards: [] };
  }
  const result = await breakDownTask(biggest);
  const subtasks = (Array.isArray(result?.subtasks) ? result.subtasks : [])
    .map((s) => (typeof s === 'string'
      ? { title: s, estimatedMinutes: 30 }
      : { title: s?.title || '', estimatedMinutes: toMinutes(s?.estimatedEffort) }))
    .filter((s) => s.title);
  return {
    kind: INTENTS.BREAKDOWN,
    content: `Here's how I'd break down your top priority, "${biggest.title}":`,
    cards: subtasks.length
      ? [{ type: 'breakdown', taskId: biggest.id, title: biggest.title, subtasks }]
      : [],
  };
}

async function rescheduleMissed(ctx) {
  const missed = activeTasks(ctx.tasks).filter((t) => t.deadline && isOverdue(t.deadline));
  if (!missed.length) {
    return { kind: INTENTS.RESCHEDULE, content: "Nothing is overdue - you're on track. Want me to plan the day instead?", cards: [] };
  }
  const result = await rescheduleTasks(ctx.tasks, missed.map((t) => t.id));
  const items = Array.isArray(result?.rescheduled) ? result.rescheduled : [];
  return {
    kind: INTENTS.RESCHEDULE,
    content: result?.summary || `I found ${missed.length} task(s) to move into open slots.`,
    cards: items.length ? [{ type: 'reschedule', title: 'Suggested new times', items }] : [],
  };
}

/** Local, deterministic risk summary - no AI call needed. */
function showRisks(ctx) {
  const active = activeTasks(ctx.tasks);
  const risky = active
    .filter((t) => ['critical', 'high', 'attention'].includes(resolveRisk(t)))
    .sort((a, b) => resolveScore(b) - resolveScore(a));
  const high = risky.filter((t) => ['critical', 'high'].includes(resolveRisk(t)));
  const content = high.length
    ? `Heads up - you have ${high.length} high-risk deadline${high.length > 1 ? 's' : ''} that need attention.`
    : risky.length
      ? `Nothing critical, but ${risky.length} task${risky.length > 1 ? 's' : ''} could use an eye.`
      : 'No deadline risks right now - you are nicely ahead.';
  const items = (high.length ? high : risky).slice(0, 5).map((t) => ({
    id: t.id,
    title: t.title,
    tone: resolveRisk(t),
    detail: t.aiReason || '',
    deadline: t.deadline || null,
  }));
  return { kind: INTENTS.RISKS, content, cards: items.length ? [{ type: 'risks', items }] : [] };
}

/**
 * Route a message and return a normalized assistant response.
 * Always resolves (never rejects) so the chat UI can render something useful.
 */
export async function runAssistant(text, ctx = {}) {
  const intent = detectIntent(text);
  try {
    switch (intent) {
      case INTENTS.PLAN:
        return withMode(await planDay(ctx));
      case INTENTS.BREAKDOWN:
        return withMode(await breakdownBiggest(ctx));
      case INTENTS.RESCHEDULE:
        return withMode(await rescheduleMissed(ctx));
      case INTENTS.RISKS:
        return withMode(showRisks(ctx));
      default:
        return withMode(await copilotChat(text, ctx));
    }
  } catch (err) {
    console.warn('[assistantEngine] route failed, returning graceful fallback:', err);
    return withMode({
      kind: 'error',
      content: "I hit a snag working that out. Mind trying that again?",
      cards: [],
    });
  }
}

function withMode(res) {
  return { ...res, mode: getAIMode() };
}
