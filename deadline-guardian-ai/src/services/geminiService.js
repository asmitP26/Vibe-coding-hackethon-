/*
 * geminiService - FRONTEND AI client for Deadline Guardian AI.
 *
 * SECURE ARCHITECTURE:  React Frontend (this file) -> Backend API Route -> Gemini
 *   This module NEVER talks to Gemini directly and NEVER reads an API key. It
 *   calls our own backend endpoints (/api/ai/*), and the backend holds the key
 *   server-side (process.env.GEMINI_API_KEY). The Gemini key is therefore never
 *   shipped to or required by the browser.
 *
 * Modes (reported by the backend at GET /api/ai/status):
 *   - LIVE : the backend has GEMINI_API_KEY set -> responses come from Gemini.
 *   - MOCK : no key on the server, OR the backend is unreachable -> realistic,
 *            deterministic fallback data (identical shapes) is used instead.
 *
 * Every public function keeps its original signature and return shape, so the
 * UI is unchanged. Calls are defensive: if the backend errors or is offline the
 * frontend returns a locally-built mock, so the AI layer can never crash the UI.
 */
import {
  calculatePriorityScore,
  getRiskLevel,
  sortTasksByPriority,
} from './taskEngine';

// ============================================================================
// 1. BACKEND TRANSPORT - all AI work goes through our own server proxy.
// ----------------------------------------------------------------------------
// SECURITY_NOTE: there is NO API key in this file. The Gemini key lives only on
// the backend (process.env.GEMINI_API_KEY). The frontend talks to same-origin
// /api/ai/* routes, which Vite proxies to the backend during development and
// which are served by the same deployment in production.
// ============================================================================
const AI_BASE = '/api/ai';
const REQUEST_TIMEOUT_MS = 20000;
// The conversational assistant reply can take longer than quick structured
// calls (grounded, multi-sentence generation), so it gets a larger budget to
// avoid timing out into the local fallback while the backend is still working.
const ASSISTANT_TIMEOUT_MS = 45000;

/** True for a non-null, non-array object - used to safely backfill fields. */
function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * POST JSON to a backend AI endpoint and return parsed JSON.
 * NEVER throws: on any HTTP / network / timeout error it logs a safe warning
 * and returns `fallback` (the locally-built mock), so the UI always gets data.
 */
async function postAI(path, body, fallback, options = {}) {
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[geminiService] Backend ${path} returned ${res.status} - using local mock.`);
      return fallback;
    }
    const data = await res.json();
    // Backfill any missing top-level fields from the mock so the shape matches.
    return isPlainObject(data) && isPlainObject(fallback) ? { ...fallback, ...data } : data;
  } catch (error) {
    console.warn(`[geminiService] Backend ${path} unavailable - using local mock.`, error);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// 2. AI MODE STATUS - drives the "Gemini Live via Secure Backend" / "Mock AI"
//    badge. The backend's GET /api/ai/status is the single source of truth.
// ============================================================================
let cachedStatus = { mode: 'mock', provider: 'Google Gemini', secureProxy: true, configured: false, model: null, lastError: null };

/** Fetch + cache the backend AI status. Falls back to mock if unreachable. */
export async function fetchAIStatus() {
  try {
    const res = await fetch(`${AI_BASE}/status`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (isPlainObject(data) && (data.mode === 'live' || data.mode === 'mock')) {
        cachedStatus = {
          mode: data.mode,
          provider: data.provider ?? 'Google Gemini',
          secureProxy: data.secureProxy !== false,
          configured: data.configured === true,
          model: typeof data.model === 'string' ? data.model : null,
          lastError: typeof data.lastError === 'string' ? data.lastError : null,
        };
      }
    }
  } catch {
    // Backend unreachable -> stay in mock mode (no key is ever exposed).
  }
  return cachedStatus;
}

/** Cached AI status object: { mode, provider, secureProxy }. */
export function getAIStatus() {
  return cachedStatus;
}

/** Current AI mode: "live" or "mock" (cached; defaults to "mock" at startup). */
export function getAIMode() {
  return cachedStatus.mode;
}

// Kick off an initial status fetch as soon as the module loads (browser only).
if (typeof window !== 'undefined') {
  fetchAIStatus();
}

// ============================================================================
// 2. RESPONSE SCHEMAS - the exact JSON shapes Gemini must return.
//    These double as (a) living documentation and (b) one-shot examples that
//    are embedded directly into the prompts below. Values are illustrative.
// ============================================================================

/** Shape returned by analyzeTask(). */
export const TASK_ANALYSIS_SCHEMA = {
  taskId: 't1',
  priorityScore: 96, // integer 0-100
  riskLevel: 'critical', // "critical" | "high" | "attention" | "safe"
  estimatedEffort: 8, // hours (decimals allowed)
  recommendedStart: '2026-06-25T21:00:00', // local ISO datetime, or null
  category: 'Hackathon', // a short, improved category label
  reason: 'Highest-impact deadline with the most remaining effort - start now to avoid a crunch.',
  nextBestAction: 'Open the repo and scaffold the core feature flow before anything else.',
  reminderMessage: 'Heads up: your hackathon MVP is due tonight - start the core build now.',
  suggestedSubtasks: [
    'Define the MVP "done" criteria',
    'Build the core feature flow',
    'Polish the UI and fix bugs',
    'Deploy and verify the submission',
  ],
  // Reasonable assumptions made when input data was missing/ambiguous (else []).
  assumptions: ['Estimated effort inferred from the task scope; no explicit value was provided.'],
};

/** Shape returned by generateDailyPlan(). */
export const DAILY_PLAN_SCHEMA = {
  date: '2026-06-25', // YYYY-MM-DD
  summary: 'Your toughest task is scheduled first while energy is high, with breaks to stay fresh.',
  focusHours: 6.5,
  // type: "focus" | "work" | "habit" | "meeting" | "break"; times are 24h "HH:MM".
  blocks: [
    { id: 'gen-t1', taskId: 't1', title: 'Deep Work - Hackathon MVP core', start: '09:00', end: '11:00', type: 'focus' },
    { id: 'gen-break-1', taskId: null, title: 'Short break', start: '11:00', end: '11:15', type: 'break' },
    { id: 'gen-t2', taskId: 't2', title: 'Write README & Google Doc', start: '11:15', end: '12:15', type: 'work' },
  ],
  // Reasonable assumptions made when input data was missing/ambiguous (else []).
  assumptions: ['Assumed a 09:00-22:00 availability window since none was specified.'],
};

/** Shape returned by breakDownTask(). */
export const TASK_BREAKDOWN_SCHEMA = {
  taskId: 't1',
  subtasks: [
    { title: 'Set up project structure & routing', estimatedEffort: 0.5 },
    { title: 'Build the core feature flow', estimatedEffort: 3 },
    { title: 'Polish UI and responsiveness', estimatedEffort: 2 },
    { title: 'Test end-to-end & fix bugs', estimatedEffort: 1.5 },
    { title: 'Deploy and verify submission', estimatedEffort: 1 },
  ],
  // Reasonable assumptions made when input data was missing/ambiguous (else []).
  assumptions: ['Per-step effort estimated from the task scope; no historical data was given.'],
};

/** Shape returned by rescheduleTasks(). */
export const RESCHEDULE_SCHEMA = {
  summary: "Moved 1 at-risk task into tonight's open slot and protected your critical deadline.",
  rescheduled: [
    {
      taskId: 't4',
      title: 'Pay electricity bill',
      newStart: '18:00', // 24h "HH:MM"
      newEnd: '18:15',
      reason: 'Quick win slotted in before deep work resumes.',
    },
  ],
  // Reasonable assumptions made when input data was missing/ambiguous (else []).
  assumptions: ['Assumed evening slots from 18:00 onward are free.'],
};

/** Shape returned by getProductivityCoaching(). */
export const PRODUCTIVITY_COACH_SCHEMA = {
  summary: 'Strong week - a 78% completion rate and a 12-day streak show real consistency.',
  productivityScore: 82, // integer 0-100
  focusRecommendation: 'Protect one 2-hour distraction-free block each evening to de-risk deadlines.',
  // tone: "critical" | "high" | "attention" | "safe"
  recommendations: [
    { id: 'rec-1', emoji: '\u{1F680}', title: 'Start the MVP build now', detail: "It's your highest-risk deadline tonight - begin with the core feature.", tone: 'critical' },
    { id: 'rec-2', emoji: '\u{1F9E0}', title: 'Protect a 2-hour focus block', detail: 'Reserve distraction-free time to de-risk the MVP deadline.', tone: 'high' },
    { id: 'rec-3', emoji: '\u{1F525}', title: 'Keep your 12-day DSA streak alive', detail: 'A short practice set tonight maintains momentum.', tone: 'safe' },
  ],
  strengths: ['Consistent daily habits', 'High completion rate'],
  improvements: ['Reduce last-minute crunches', 'Batch quick admin tasks'],
  // Reasonable assumptions made when input data was missing/ambiguous (else []).
  assumptions: ['Assumed baseline focus capacity where stats were incomplete.'],
};

// ============================================================================
// 4. TIME HELPERS - used by the deterministic mock builders below.
// ============================================================================
const pad = (n) => String(n).padStart(2, '0');
const fmtHour = (h) => `${pad(Math.floor(h))}:${pad(Math.round((h - Math.floor(h)) * 60))}`;
const diffHours = (start, end) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
};

// ============================================================================
// 5. MOCK HELPERS - realistic, deterministic fallbacks (also the Day 1 output).
// ============================================================================

/** Pick a human reason string for a given risk level. */
function mockReason(risk) {
  switch (risk) {
    case 'critical':
      return 'Highest-impact deadline with the most remaining effort - start now to avoid a crunch.';
    case 'high':
      return 'Important and due soon. Reserve a focused block today.';
    case 'attention':
      return 'Time-sensitive but lower effort - clear it quickly to reduce noise.';
    default:
      return 'On track. Keep steady progress and it stays low-risk.';
  }
}

/** Generic, task-aware subtask suggestions. */
function mockSubtasks(task) {
  const title = (task?.title || 'the task').trim();
  return [
    `Define the goal & "done" criteria for "${title}"`,
    'Gather the files, links, and context you need',
    'Draft the first version or rough outline',
    'Review, refine, and fix any gaps',
    'Finalize and mark it complete',
  ];
}

/** A single, concrete "do this next" suggestion based on risk. */
function mockNextAction(task, risk) {
  const title = (task?.title || 'this task').trim();
  if (risk === 'critical' || risk === 'high') {
    return `Block focused time now and start the hardest part of "${title}".`;
  }
  if (risk === 'attention') {
    return `Knock out "${title}" quickly while it is still small.`;
  }
  return `Take the first small step on "${title}" to build momentum.`;
}

/** A short, friendly reminder/nudge based on risk. */
function mockReminder(task, risk) {
  const title = (task?.title || 'this').trim();
  switch (risk) {
    case 'critical':
      return `Don't let "${title}" slip - it's your top priority right now.`;
    case 'high':
      return `Keep "${title}" on your radar today.`;
    case 'attention':
      return `A quick nudge: "${title}" is time-sensitive.`;
    default:
      return `No rush on "${title}" - steady progress keeps it on track.`;
  }
}

// ============================================================================
// 6. PUBLIC API - the UI calls these. Signatures and return shapes are
//    unchanged; each builds a deterministic mock, then asks the secure backend
//    proxy (/api/ai/*) for a live result, falling back to the mock on any error.
// ============================================================================

/**
 * Analyze a single task: priority, risk, effort, reasoning, and quick subtasks.
 * @returns {Promise<typeof TASK_ANALYSIS_SCHEMA>}
 */
export async function analyzeTask(task) {
  const priorityScore = task?.priorityScore ?? calculatePriorityScore(task);
  const riskLevel = task?.riskLevel ?? getRiskLevel(task);
  const assumptions = [];
  if (task?.estimatedEffort == null) assumptions.push('No effort provided; estimated a default of 1 hour.');
  if (task?.deadline == null) assumptions.push('No deadline provided; treated the task as flexible.');
  if (task?.importance == null) assumptions.push('No importance set; assumed medium importance.');
  const mockResponse = {
    taskId: task?.id ?? null,
    priorityScore,
    riskLevel,
    estimatedEffort: task?.estimatedEffort ?? 1,
    recommendedStart: null,
    category: task?.category || 'Inbox',
    reason: task?.aiReason || mockReason(riskLevel),
    nextBestAction: mockNextAction(task, riskLevel),
    reminderMessage: mockReminder(task, riskLevel),
    suggestedSubtasks: mockSubtasks(task),
    assumptions,
  };
  return postAI('/analyze-task', { task }, mockResponse);
}

/**
 * Generate an optimized, time-blocked daily plan from tasks + availability.
 * @returns {Promise<typeof DAILY_PLAN_SCHEMA>}
 */
export async function generateDailyPlan(tasks = [], availability = {}) {
  const ranked = sortTasksByPriority(tasks).filter((t) => t.status !== 'completed');
  const startHour = Number(availability.startHour) || 9;
  const endHour = Number(availability.endHour) || 22;

  let cursor = startHour;
  const blocks = [];
  ranked.slice(0, 5).forEach((task, i) => {
    const duration = Math.min(2, Math.max(1, Math.round(task.estimatedEffort || 1)));
    if (cursor + duration > endHour) return;
    const start = cursor;
    blocks.push({
      id: `gen-${task.id}`,
      taskId: task.id,
      title: task.title,
      start: fmtHour(start),
      end: fmtHour(start + duration),
      type: i === 0 ? 'focus' : 'work',
    });
    cursor = Math.min(endHour, start + duration + 0.25);
  });

  const focusHours = Math.round(blocks.reduce((sum, b) => sum + diffHours(b.start, b.end), 0) * 10) / 10;
  const assumptions = [];
  if (availability.startHour == null || availability.endHour == null) {
    assumptions.push(`Assumed a ${fmtHour(startHour)}-${fmtHour(endHour)} availability window.`);
  }
  if (ranked.some((t) => t.estimatedEffort == null)) {
    assumptions.push('Some tasks had no effort estimate; assumed ~1-2 hours each.');
  }
  const mockResponse = {
    date: new Date().toISOString().slice(0, 10),
    summary: blocks.length
      ? `Planned ${blocks.length} blocks around your highest-priority work - your toughest task is first while energy is high.`
      : 'No open tasks to schedule right now. Enjoy the breathing room or add something new.',
    focusHours,
    blocks,
    assumptions,
  };
  return postAI('/generate-daily-plan', { tasks, availability: { startHour, endHour } }, mockResponse);
}

/**
 * Break a task into an ordered, actionable checklist.
 * Tip: to feed AppContext.addSubtasks(taskId, titles), map to titles first:
 *   result.subtasks.map((s) => s.title)
 * @returns {Promise<typeof TASK_BREAKDOWN_SCHEMA>}
 */
export async function breakDownTask(task) {
  const mockResponse = {
    taskId: task?.id ?? null,
    subtasks: mockSubtasks(task).map((title) => ({ title, estimatedEffort: 1 })),
    assumptions: task?.estimatedEffort == null
      ? ['No effort estimate on the task; assumed ~1 hour per step.']
      : [],
  };
  return postAI('/break-down-task', { task }, mockResponse);
}

/**
 * Replan missed / at-risk tasks into the next available slots.
 * @returns {Promise<typeof RESCHEDULE_SCHEMA>}
 */
export async function rescheduleTasks(tasks = [], missedTaskIds = []) {
  const missed = tasks.filter((t) => missedTaskIds.includes(t.id));
  // Spread into evening slots but never past a real 23:00 end (no impossible times).
  const RESCHEDULE_START = 18;
  const rescheduled = missed.slice(0, 5).map((task, i) => {
    const startHour = Math.min(22, RESCHEDULE_START + i);
    return {
      taskId: task.id,
      title: task.title,
      newStart: `${pad(startHour)}:00`,
      newEnd: `${pad(Math.min(23, startHour + 1))}:00`,
      reason: 'Slotted into the next open evening block to protect your critical deadline.',
    };
  });
  const mockResponse = {
    summary: rescheduled.length
      ? `Moved ${rescheduled.length} at-risk task(s) into tonight's open slots and protected your critical deadline.`
      : 'Nothing to reschedule - you are on track.',
    rescheduled,
    assumptions: rescheduled.length ? ['Assumed open evening slots from 18:00 onward.'] : [],
  };
  return postAI('/reschedule-tasks', { tasks, missedTaskIds }, mockResponse);
}

/**
 * Productivity coaching: an encouraging review + concrete recommendations.
 * Pass an optional free-text `question` to answer the user directly.
 * @returns {Promise<typeof PRODUCTIVITY_COACH_SCHEMA>}
 */
export async function getProductivityCoaching(stats = {}, tasks = [], question = '') {
  const productivityScore = stats.productivityScore ?? 0;
  const completionRate = stats.completionRate ?? 0;
  const ask = typeof question === 'string' ? question.trim() : '';

  const atRisk = tasks.filter((t) => ['critical', 'high'].includes(t.riskLevel ?? getRiskLevel(t)));
  const emojis = ['\u{1F680}', '\u{1F9E0}', '\u26A1', '\u{1F4CC}', '\u{1F525}'];
  const recommendations = atRisk.slice(0, 4).map((task, i) => {
    const tone = task.riskLevel ?? getRiskLevel(task);
    return {
      id: `rec-${i + 1}`,
      emoji: emojis[i] ?? '\u2705',
      title: `Prioritize "${task.title}"`,
      detail: task.aiReason || mockReason(tone),
      tone,
    };
  });
  if (!recommendations.length) {
    recommendations.push({
      id: 'rec-1',
      emoji: '\u2705',
      title: 'Keep your momentum',
      detail: 'No high-risk deadlines right now - protect a focus block to stay ahead.',
      tone: 'safe',
    });
  }

  const assumptions = (stats == null || Object.keys(stats).length === 0)
    ? ['No productivity stats provided; assumed baseline values.']
    : [];
  const mockResponse = {
    summary: ask
      ? `On "${ask}": with a ${completionRate}% completion rate and a productivity score of ${productivityScore}, focus your next block on your highest-risk deadline and let the rest flow around it.`
      : `Solid work - a ${completionRate}% completion rate and a productivity score of ${productivityScore} show real consistency.`,
    productivityScore,
    focusRecommendation: 'Protect one 2-hour distraction-free block each day to de-risk your nearest deadline.',
    recommendations,
    strengths: ['Consistent daily habits', 'Strong completion rate'],
    improvements: ['Reduce last-minute crunches', 'Batch quick admin tasks together'],
    assumptions,
  };
  return postAI('/productivity-coach', { stats, tasks, question: ask }, mockResponse);
}

/**
 * Context-aware Copilot reply. Sends the FULL app context (tasks, habits,
 * schedule, stats, current time) + recent history + the detected intent to the
 * secure backend, which returns an intelligent natural-language reply.
 *
 * The structured response CARDS are built locally (see copilotBrain) - this only
 * upgrades the reply TEXT when a Gemini key is configured. In mock mode (or if
 * the backend is unreachable) it resolves to `fallbackReply`, so the Copilot
 * always answers.
 *
 * @param {{message:string, context:object, history:Array, intent:string}} payload
 * @param {string} fallbackReply  Deterministic reply used when AI is off/unreachable.
 * @returns {Promise<{ reply:string, mode:'live'|'mock', fallbackUsed:boolean, configured:boolean, reason:string|null }>}
 *   `mode`/`fallbackUsed`/`configured` describe THIS reply (per-response), so the
 *   UI can flag a single fallback message without mislabeling the whole session.
 */
export async function chatWithCopilot(payload = {}, fallbackReply = '') {
  const body = {
    message: typeof payload.message === 'string' ? payload.message : '',
    context: isPlainObject(payload.context) ? payload.context : {},
    history: Array.isArray(payload.history) ? payload.history.slice(-5) : [],
    intent: typeof payload.intent === 'string' ? payload.intent : 'chat',
  };
  const data = await postAI('/assistant-chat', body, { reply: fallbackReply }, { timeoutMs: ASSISTANT_TIMEOUT_MS });
  const replyText = data && typeof data.reply === 'string' ? data.reply.trim() : '';
  const reply = replyText || fallbackReply;
  const mode = data && (data.mode === 'live' || data.mode === 'mock') ? data.mode : getAIMode();
  const configured = typeof data?.configured === 'boolean' ? data.configured : (getAIStatus().configured === true);
  // Prefer the backend's explicit flag; otherwise infer: a non-live reply means
  // the local fallback was shown. We only treat that as a *failure* (warning)
  // when a key is actually configured - pure mock mode is normal, not an error.
  const fallbackUsed = typeof data?.fallbackUsed === 'boolean' ? data.fallbackUsed : (mode !== 'live');
  const reason = typeof data?.reason === 'string' ? data.reason : null;
  return { reply, mode, fallbackUsed, configured, reason };
}
