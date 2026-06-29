/*
 * geminiServerService - SERVER-SIDE Gemini integration.
 *
 * SECURE ARCHITECTURE:  Frontend -> Backend API Route -> Gemini API
 *   The browser NEVER sees the Gemini API key. The key is read here, on the
 *   server, from process.env.GEMINI_API_KEY only. The frontend talks to our own
 *   /api/ai/* routes; this module is the single place that talks to Google.
 *
 * Modes:
 *   - LIVE mode  (GEMINI_API_KEY set): each agent builds a strict-JSON prompt
 *     and calls the real Gemini API through the single generateJSON() transport.
 *   - MOCK mode  (no key): every agent returns realistic, deterministic data so
 *     the app works fully offline with zero configuration.
 *
 * generateJSON() NEVER throws - any failure falls back to mock data and is
 * logged with a SAFE message (never the key, never user secrets).
 */
import { safeParseJSON, isPlainObject, withFallbackShape } from '../utils/safeJson.js';

// ============================================================================
// 1. CONFIGURATION - server-only key + endpoint.
// ----------------------------------------------------------------------------
// SECURITY_NOTE: the key is read ONLY from process.env.GEMINI_API_KEY. It is
// never sent to the browser, never hardcoded, and never logged.
// ============================================================================
const PLACEHOLDER_KEYS = ['<REPLACE_ME>', 'your_google_ai_studio_key_here', 'your_key_here'];

// Default to a current, supported model. `gemini-1.5-flash` was retired on the
// public v1beta endpoint and returns 404, which is the root cause of the
// "Gemini request failed: 404 Not Found" fallback loop. The model is
// overridable via GEMINI_MODEL so deployments can pin a specific version.
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** The active model name (env override -> sensible default). */
export function getGeminiModel() {
  const m = process.env.GEMINI_MODEL;
  return typeof m === 'string' && m.trim() ? m.trim() : DEFAULT_GEMINI_MODEL;
}

// Back-compat export; some modules import GEMINI_MODEL directly.
export const GEMINI_MODEL = getGeminiModel();

// When the configured/default model returns 404 for the caller's key, we
// auto-discover a working model (via ListModels) and cache it here for the rest
// of the process so the discovery only happens once.
let resolvedModel = null;

/** The model actually in use: an auto-resolved one (after a 404) or the configured/default. */
export function getActiveModel() {
  return resolvedModel || getGeminiModel();
}

/** Read the key fresh each call so env changes are picked up without caching. */
function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

/** True only when a real, non-placeholder key is present in the environment. */
export function isGeminiConfigured() {
  const key = getApiKey();
  return key.length > 0 && !PLACEHOLDER_KEYS.includes(key);
}

// ----------------------------------------------------------------------------
// LIVE HEALTH STATE - tracks whether real Gemini calls are actually working, so
// the "AI mode" badge reflects reality instead of merely "a key is present".
//   - configured: a real key is set.
//   - mode: "live" only after a successful call; "mock" if no key OR the last
//     call failed (so a wrong model / quota / network issue is surfaced).
//   - lastError: a SAFE, key-free message from the most recent failure.
// ----------------------------------------------------------------------------
const geminiHealth = {
  lastOk: null, // boolean | null (null = no call attempted yet this process)
  lastError: null, // safe string | null
  lastCheckedAt: null, // ISO string | null
};

function recordGeminiSuccess() {
  geminiHealth.lastOk = true;
  geminiHealth.lastError = null;
  geminiHealth.lastCheckedAt = new Date().toISOString();
}

function recordGeminiFailure(message) {
  geminiHealth.lastOk = false;
  geminiHealth.lastError = typeof message === 'string' && message ? message : 'unknown error';
  geminiHealth.lastCheckedAt = new Date().toISOString();
}

/**
 * Current AI mode for the badge / status endpoint.
 *   - "mock" when no key is configured.
 *   - "mock" when the most recent live call FAILED (lastOk === false).
 *   - "live" when configured and the last call succeeded (or none has run yet,
 *     which is the optimistic default until the first request resolves).
 */
export function getAIMode() {
  if (!isGeminiConfigured()) return 'mock';
  return geminiHealth.lastOk === false ? 'mock' : 'live';
}

/** Detailed, key-free health snapshot used by GET /api/ai/status and /test. */
export function getGeminiHealth() {
  return {
    configured: isGeminiConfigured(),
    mode: getAIMode(),
    model: getActiveModel(),
    lastOk: geminiHealth.lastOk,
    lastError: geminiHealth.lastError,
    lastCheckedAt: geminiHealth.lastCheckedAt,
  };
}

// ============================================================================
// 2. LOCAL PRIORITIZATION HELPERS (self-contained copy of the task engine).
//    Kept here so the server has zero dependency on the frontend `src/` tree.
// ============================================================================
const DEFAULT_IMPORTANCE = 3;

function clamp(n, min, max) {
  const value = Number(n);
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function hoursUntil(value) {
  return Math.round((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60));
}

function isOverdue(value) {
  return new Date(value).getTime() < Date.now();
}

function calculatePriorityScore(task) {
  if (!task || task.status === 'completed') return 0;
  const importance = clamp(task.importance ?? DEFAULT_IMPORTANCE, 1, 5);
  const importanceScore = (importance / 5) * 45;

  let urgencyScore;
  if (!task.deadline) {
    urgencyScore = 10;
  } else if (isOverdue(task.deadline)) {
    urgencyScore = 40;
  } else {
    const hrs = hoursUntil(task.deadline);
    if (hrs <= 12) urgencyScore = 38;
    else if (hrs <= 24) urgencyScore = 34;
    else if (hrs <= 48) urgencyScore = 28;
    else if (hrs <= 72) urgencyScore = 22;
    else if (hrs <= 24 * 7) urgencyScore = 14;
    else urgencyScore = 7;
  }

  const effort = clamp(task.estimatedEffort ?? 1, 0, 24);
  const effortScore = Math.min(15, (effort / 8) * 15);
  return Math.round(Math.min(100, importanceScore + urgencyScore + effortScore));
}

function getRiskLevel(task) {
  if (!task || task.status === 'completed') return 'safe';
  if (!task.deadline) return 'safe';
  const importance = clamp(task.importance ?? DEFAULT_IMPORTANCE, 1, 5);
  if (isOverdue(task.deadline)) return importance >= 4 ? 'critical' : 'attention';
  const hrs = hoursUntil(task.deadline);
  if (hrs <= 24) return importance >= 4 ? 'critical' : 'high';
  if (hrs <= 60) return importance >= 4 ? 'high' : 'attention';
  if (hrs <= 24 * 5) return importance >= 4 ? 'attention' : 'safe';
  return 'safe';
}

const resolveScore = (task) => task?.priorityScore ?? calculatePriorityScore(task);
const resolveRisk = (task) => task?.riskLevel ?? getRiskLevel(task);

function sortTasksByPriority(tasks = []) {
  const list = Array.isArray(tasks) ? tasks : [];
  return [...list].sort((a, b) => resolveScore(b) - resolveScore(a));
}

// ============================================================================
// 3. RESPONSE SCHEMAS - the exact JSON shapes Gemini must return. They double
//    as living docs and as one-shot examples embedded into the prompts.
// ============================================================================
export const TASK_ANALYSIS_SCHEMA = {
  taskId: 't1',
  priorityScore: 95,
  riskLevel: 'critical',
  estimatedEffort: 3,
  recommendedStart: '2026-06-28T18:00:00',
  category: 'Study',
  reason: 'Your most urgent deadline tonight - a few focused hours now means you submit with time to spare.',
  nextBestAction: 'Open the assignment and finish the SQL queries before anything else.',
  reminderMessage: 'Heads up: your database assignment is due tonight - start the core work now.',
  suggestedSubtasks: [
    'Finalize the schema & ER diagram',
    'Write and test the SQL queries',
    'Add the normalization write-up',
    'Proofread and submit on the portal',
  ],
  assumptions: ['Estimated effort inferred from the task scope; no explicit value was provided.'],
};

export const DAILY_PLAN_SCHEMA = {
  date: '2026-06-28',
  summary: 'Your toughest task is scheduled first while energy is high, with breaks to stay fresh.',
  focusHours: 6.5,
  blocks: [
    { id: 'gen-t1', taskId: 't1', title: 'Deep Work - Database assignment', start: '09:30', end: '11:30', type: 'focus' },
    { id: 'gen-break-1', taskId: null, title: 'Short break', start: '11:30', end: '11:45', type: 'break' },
    { id: 'gen-t3', taskId: 't3', title: 'Technical interview prep', start: '11:45', end: '12:45', type: 'work' },
  ],
  assumptions: ['Assumed a 09:00-22:00 availability window since none was specified.'],
};

export const TASK_BREAKDOWN_SCHEMA = {
  taskId: 't1',
  subtasks: [
    { title: 'Finalize the schema & ER diagram', estimatedEffort: 0.5 },
    { title: 'Write the SQL queries', estimatedEffort: 1 },
    { title: 'Test queries against sample data', estimatedEffort: 0.5 },
    { title: 'Add the normalization write-up', estimatedEffort: 0.5 },
    { title: 'Proofread and submit on the portal', estimatedEffort: 0.5 },
  ],
  assumptions: ['Per-step effort estimated from the task scope; no historical data was given.'],
};

export const RESCHEDULE_SCHEMA = {
  summary: "Moved 1 at-risk task into tonight's open slot and protected your critical deadline.",
  rescheduled: [
    { taskId: 't4', title: 'Pay electricity bill', newStart: '18:00', newEnd: '18:15', reason: 'Quick win slotted in before deep work resumes.' },
  ],
  assumptions: ['Assumed evening slots from 18:00 onward are free.'],
};

export const PRODUCTIVITY_COACH_SCHEMA = {
  summary: 'Strong week - a 78% completion rate and a 12-day streak show real consistency.',
  productivityScore: 82,
  focusRecommendation: 'Protect one 2-hour distraction-free block each evening to de-risk deadlines.',
  recommendations: [
    { id: 'rec-1', emoji: '\u{1F4DD}', title: 'Submit the database assignment tonight', detail: "It's your highest-risk deadline tonight - start with the SQL queries.", tone: 'critical' },
    { id: 'rec-2', emoji: '\u{1F9E0}', title: 'Protect a 2-hour focus block', detail: 'Reserve distraction-free time to de-risk your nearest deadline.', tone: 'high' },
    { id: 'rec-3', emoji: '\u{1F525}', title: 'Keep your 12-day DSA streak alive', detail: 'A short practice set today maintains momentum.', tone: 'safe' },
  ],
  strengths: ['Consistent daily habits', 'High completion rate'],
  improvements: ['Reduce last-minute crunches', 'Batch quick admin tasks'],
  assumptions: ['Assumed baseline focus capacity where stats were incomplete.'],
};

// ============================================================================
// 4. PROMPT TEMPLATES - each instructs Gemini to reply with STRICT JSON only.
// ============================================================================
export const TASK_ANALYSIS_PROMPT = `You are Deadline Guardian, an expert productivity assistant.
Analyze the single task in INPUT and assess its priority, deadline risk, realistic
effort, the best time to start, and a short actionable breakdown.

Rules:
- priorityScore: integer 0 (trivial) to 100 (drop everything); weigh deadline proximity, estimated effort, importance, and completion status.
- riskLevel: one of "critical", "high", "attention", "safe".
- estimatedEffort: realistic hours for the task scope (decimals allowed); never zero or impossibly small.
- recommendedStart: local ISO datetime string, or null if flexible.
- category: a short label; keep the user's category unless a clearly better fit exists.
- reason: ONE concise, motivating sentence (max 160 chars).
- nextBestAction: the single most useful next step as one short imperative sentence.
- reminderMessage: a brief, friendly nudge to resurface later (max 140 chars).
- suggestedSubtasks: 3-6 short, actionable steps.

Respond with ONLY valid JSON - no markdown, no code fences, no commentary.
Use exactly this shape (values are illustrative):
${JSON.stringify(TASK_ANALYSIS_SCHEMA, null, 2)}`;

export const DAILY_PLANNER_PROMPT = `You are Deadline Guardian, an expert daily planner.
Build a realistic, time-blocked schedule for today from the tasks and availability in INPUT.

Rules:
- Order work by deadline proximity, estimated effort, importance, and completion status (skip completed tasks); schedule the highest-priority / highest-risk work first, while energy is high.
- Use 24-hour "HH:MM" times within the availability window. Blocks must NOT overlap and durations must be realistic (no impossible, back-to-back marathons).
- type: one of "focus", "work", "habit", "meeting", "break".
- Add short breaks between long focus blocks.
- Stay within the provided availability window.
- summary: 1-2 encouraging sentences describing the strategy.

Respond with ONLY valid JSON - no markdown, no code fences, no commentary.
Use exactly this shape (values are illustrative):
${JSON.stringify(DAILY_PLAN_SCHEMA, null, 2)}`;

export const TASK_BREAKDOWN_PROMPT = `You are Deadline Guardian.
Break the task in INPUT into a clear, ordered checklist a person can follow start to finish.

Rules:
- Return 4-7 subtasks, each a short imperative phrase (max 80 chars).
- Order them logically from the first step to completion.
- estimatedEffort: hours for each subtask (decimals allowed).

Respond with ONLY valid JSON - no markdown, no code fences, no commentary.
Use exactly this shape (values are illustrative):
${JSON.stringify(TASK_BREAKDOWN_SCHEMA, null, 2)}`;

export const RESCHEDULER_PROMPT = `You are Deadline Guardian, a recovery-focused scheduler.
The tasks in INPUT were missed or are at risk. Fit them into the remaining open slots
today (or the soonest sensible time) WITHOUT dropping protected deadlines.

Rules:
- Use 24-hour "HH:MM" times within a real day (00:00-23:59); new blocks must not overlap existing commitments and durations must be realistic.
- Place the most urgent/important task in the earliest viable slot, weighing deadline proximity, effort, and importance.
- reason: one short sentence per task explaining its new slot.
- summary: 1-2 sentences describing the overall recovery plan.

Respond with ONLY valid JSON - no markdown, no code fences, no commentary.
Use exactly this shape (values are illustrative):
${JSON.stringify(RESCHEDULE_SCHEMA, null, 2)}`;

export const PRODUCTIVITY_COACH_PROMPT = `You are Deadline Guardian, a supportive productivity coach.
Using the stats and recent tasks in INPUT, give an honest, encouraging review with concrete
recommendations to improve focus and hit deadlines.

Rules:
- recommendations: 3-5 items; each tone is one of "critical", "high", "attention", "safe".
- Be specific and reference the user's real numbers where useful.
- If INPUT.question is present, answer it directly in the summary first, then back it with recommendations.
- strengths and improvements: 2-3 short phrases each.
- Keep every string concise and free of markdown.

Respond with ONLY valid JSON - no markdown, no code fences, no commentary.
Use exactly this shape (values are illustrative):
${JSON.stringify(PRODUCTIVITY_COACH_SCHEMA, null, 2)}`;

/** Shape returned by the context-aware Copilot chat. */
export const ASSISTANT_CHAT_SCHEMA = {
  reply: "It's tight but doable - you have a few focused hours left this evening. Start the database assignment now; defer the bill if you slip.",
};

/** Per-intent steer appended to the chat prompt so replies stay on-target. */
export const ASSISTANT_INTENT_GUIDES = {
  now: 'The user wants to know what to do RIGHT NOW. Name the single highest-priority task and the one next action, referencing the current/next schedule block and the time of day.',
  feasibility: 'The user asks if they can finish everything today. Give an honest verdict (yes / tight / not all of it), compare hours of work left to focus time left, and call out what is at risk.',
  time_box: 'The user has a limited time window. Recommend the best 1-3 tasks that fit the window, highest-impact first, and encourage a single focused block.',
  energy: 'The user is tired or low on energy. Be warm and protective. Suggest only light, low-effort work or genuine rest - never pile on pressure.',
  insights: 'The user wants to know what they are doing wrong. Give a candid but encouraging behavioral read using their real stats (completion rate, missed deadlines, streaks) and one concrete change.',
  chat: 'Answer helpfully using the user\u2019s real tasks, habits, schedule, and stats. Keep them oriented toward their highest-priority work.',
};

export const ASSISTANT_CHAT_PROMPT = `You are Deadline Guardian, a warm, sharp productivity Copilot.
Using the FULL context in INPUT (tasks, habits, scheduleBlocks, productivityStats, currentTime)
and the recent conversation in INPUT.history, write ONE short, specific spoken-style reply.

Rules:
- 2-4 sentences, conversational and encouraging - like a smart friend, not a robot.
- Ground every claim in the real data provided (task titles, deadlines, hours, stats, streaks).
- Use INPUT.currentTime to reason about how much of the day is left.
- Use INPUT.history for continuity; do not repeat yourself if a follow-up.
- Do NOT output bullet lists, tables, schedules, or markdown - the app renders structured
  cards separately. Your job is only the natural-language framing/insight.
- No headings, no emojis spam (at most one), no code fences.

Respond with ONLY valid JSON - no markdown, no code fences, no commentary.
Use exactly this shape:
${JSON.stringify(ASSISTANT_CHAT_SCHEMA, null, 2)}`;

// ============================================================================
// 5. PROMPT BUILDER + OUTPUT CONTRACT.
// ============================================================================
const MAX_INPUT_CHARS = 6000;

const OUTPUT_CONTRACT = `STRICT OUTPUT CONTRACT (non-negotiable):
- Respond with STRICT, valid JSON ONLY. No markdown, no code fences, no comments, and no text before or after the JSON.
- Do not include any explanation outside the JSON object.
- Use realistic, achievable time estimates and never invent impossible, overlapping, or out-of-range schedules.
- Prioritize tasks by deadline proximity, estimated effort, importance, and completion status (skip completed work).
- If any input is missing or ambiguous, make reasonable productivity assumptions and list each one as a short string in the JSON field "assumptions" (use [] when nothing was assumed).`;

function buildPrompt(template, input) {
  let json;
  try {
    json = JSON.stringify(input ?? {}, null, 2);
  } catch {
    json = '{}';
  }
  if (json.length > MAX_INPUT_CHARS) {
    json = `${json.slice(0, MAX_INPUT_CHARS)}\n/* ...input truncated for safety... */`;
  }
  return `${template}\n\n${OUTPUT_CONTRACT}\n\nINPUT:\n${json}`;
}

// ============================================================================
// 6. TRANSPORT - the single integration point with Gemini.
// ============================================================================
const REQUEST_TIMEOUT_MS = 15000;
// Conversational replies (assistant chat) and the coaching review are grounded,
// multi-sentence generations that can take noticeably longer than the quick
// structured calls - give them a larger budget so they don't time out into the
// mock fallback while a fast call (e.g. analyze-task) succeeds.
const ASSISTANT_TIMEOUT_MS = 45000;
const pad = (n) => String(n).padStart(2, '0');
const fmtHour = (h) => `${pad(Math.floor(h))}:${pad(Math.round((h - Math.floor(h)) * 60))}`;
const diffHours = (start, end) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
};

/**
 * Build the request init for a single generateContent call.
 * SECURITY_NOTE: the key is sent only in the server->Google request header and
 * is never logged or returned to the client.
 */
function generateContentInit(prompt, signal) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getApiKey(), // server-only; never logged
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    }),
    signal,
  };
}

/**
 * List the model names (without the "models/" prefix) that THIS API key can use
 * for generateContent. This is the authoritative way to learn which model
 * strings are valid for the caller's key / region / API version, and is what we
 * use to auto-recover from a 404 "model not found" error.
 */
async function listGenerateContentModels(signal) {
  const res = await fetch(`${GEMINI_API_BASE}/models`, {
    method: 'GET',
    headers: { 'x-goog-api-key': getApiKey() }, // server-only; never logged
    signal,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || errBody?.error?.status || '';
    } catch {
      /* not JSON */
    }
    throw new Error(`ListModels failed: ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ''}`);
  }
  const data = await res.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  return models
    .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
    .map((m) => (typeof m?.name === 'string' ? m.name.replace(/^models\//, '') : ''))
    .filter(Boolean);
}

/**
 * From the list of available model names, pick the best default: prefer fast,
 * current "flash" text models; never auto-select embedding / vision / tts /
 * audio / image variants even if they happen to expose generateContent.
 */
function pickBestModel(names) {
  const score = (n) => {
    const s = n.toLowerCase();
    let pts = 0;
    if (s.includes('flash')) pts += 100;
    if (s.includes('2.5')) pts += 40;
    else if (s.includes('2.0')) pts += 30;
    else if (s.includes('1.5')) pts += 10;
    if (s.includes('latest')) pts += 5;
    if (s.includes('pro')) pts += 15; // capable, just slower than flash
    if (s.includes('lite')) pts -= 3; // cheaper but weaker; prefer full flash
    if (s.includes('thinking') || s.includes('exp') || s.includes('preview')) pts -= 8;
    if (/(embedding|vision|aqa|image|imagen|tts|audio|veo)/.test(s)) pts -= 500;
    return pts;
  };
  return [...names].sort((a, b) => score(b) - score(a))[0] || null;
}

/**
 * Low-level Gemini REST call. Returns the raw model text (expected to be JSON).
 * Throws on network / HTTP errors so the caller can fall back gracefully.
 *
 * SELF-HEALING: if the configured model returns 404 ("model not found"), we ask
 * Google which models this key can actually use, switch to the best one, cache
 * it for the rest of the process, and retry once. This fixes the common
 * "Gemini request failed: 404 Not Found" loop caused by a model name that is not
 * available for the caller's key / region / API version.
 */
async function callGemini(prompt, signal) {
  const requested = getActiveModel();
  let usedModel = requested;
  let res = await fetch(`${GEMINI_API_BASE}/models/${requested}:generateContent`, generateContentInit(prompt, signal));

  if (res.status === 404) {
    let discovered = null;
    try {
      const available = await listGenerateContentModels(signal);
      discovered = pickBestModel(available);
    } catch (listErr) {
      console.warn(`[geminiServerService] Could not list models after 404: ${listErr?.message || 'unknown error'}`);
    }
    if (discovered && discovered !== requested) {
      console.warn(`[geminiServerService] Model "${requested}" returned 404; auto-switching to "${discovered}" (discovered via ListModels). Set GEMINI_MODEL=${discovered} in .env to silence this.`);
      resolvedModel = discovered;
      usedModel = discovered;
      res = await fetch(`${GEMINI_API_BASE}/models/${discovered}:generateContent`, generateContentInit(prompt, signal));
    }
  }

  if (!res.ok) {
    // Surface the real reason (status + Google's message + model) so a wrong
    // model name, expired key, or quota issue is diagnosable from the logs -
    // WITHOUT ever logging the API key.
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || errBody?.error?.status || '';
    } catch {
      /* body was not JSON; keep status text only */
    }
    const suffix = detail ? ` - ${detail}` : '';
    const httpError = new Error(`Gemini request failed: ${res.status} ${res.statusText} [model=${usedModel}]${suffix}`);
    httpError.status = res.status; // surfaced in safe logs (never the key)
    throw httpError;
  }

  const data = await res.json();
  // A blocked / empty candidate has no text; treat that as a failure to parse.
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/**
 * Classify a safe error message into a short machine-readable reason so the
 * client can react (e.g. show "timeout" vs "error"). Never inspects the key.
 */
function classifyGeminiReason(message = '') {
  const m = String(message).toLowerCase();
  if (m.includes('timed out') || m.includes('aborted')) return 'timeout';
  if (m.includes('unparseable') || m.includes('empty json')) return 'unparseable';
  if (/\b(401|403|api key|permission)\b/.test(m)) return 'auth';
  if (/\b(429|quota|rate)\b/.test(m)) return 'quota';
  if (/\b(404|not found|model)\b/.test(m)) return 'model';
  return 'error';
}

/**
 * One-line, SECURITY-safe request log. Never logs the API key or user payload -
 * only the endpoint label, model, HTTP status, ok/fallback flags and duration.
 */
function logGemini({ label, model, ok, fallbackUsed, durationMs, statusCode, note }) {
  const parts = [
    `[gemini] ${label || 'request'}`,
    `model=${model}`,
    statusCode != null ? `status=${statusCode}` : null,
    `ok=${ok === true}`,
    `fallback=${fallbackUsed === true}`,
    `${Math.max(0, Math.round(durationMs || 0))}ms`,
    note ? `- ${note}` : null,
  ].filter(Boolean);
  const line = parts.join(' ');
  if (ok) console.log(line);
  else console.warn(line);
}

/**
 * THE single transport used by every agent below.
 *   - No key configured -> returns `fallbackData` (mock mode).
 *   - Key configured     -> calls Gemini, requests JSON-only output, parses it
 *     safely, backfills missing fields from `fallbackData`.
 * NEVER throws: any network / parse error is logged with a SAFE message and
 * `fallbackData` is returned. Records live health so GET /api/ai/status can
 * report whether real calls are actually succeeding.
 *
 * @param {string} prompt        Fully-built prompt (template + INPUT).
 * @param {object} fallbackData  Deterministic mock used when AI is off or fails.
 * @param {{ timeoutMs?: number, label?: string }} [options]
 *   timeoutMs - per-call abort budget (defaults to REQUEST_TIMEOUT_MS). The
 *     conversational assistant + coach use a longer budget than quick calls
 *     because grounded, multi-sentence replies can take longer to generate.
 *   label - short endpoint name used only in safe logs.
 */
export async function generateJSON(prompt, fallbackData, options = {}) {
  if (!isGeminiConfigured()) {
    return fallbackData;
  }

  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : REQUEST_TIMEOUT_MS;
  const label = typeof options.label === 'string' && options.label ? options.label : 'generateJSON';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const text = await callGemini(prompt, controller.signal);
    const parsed = safeParseJSON(text, null);
    const durationMs = Date.now() - startedAt;
    if (parsed == null) {
      recordGeminiFailure('Gemini returned unparseable or empty JSON');
      logGemini({ label, model: getActiveModel(), ok: false, fallbackUsed: true, durationMs, statusCode: 200, note: 'unparseable JSON' });
      return fallbackData;
    }
    recordGeminiSuccess();
    logGemini({ label, model: getActiveModel(), ok: true, fallbackUsed: false, durationMs, statusCode: 200 });
    return withFallbackShape(parsed, fallbackData);
  } catch (error) {
    // Safe message only - never log the key or full user payload.
    const durationMs = Date.now() - startedAt;
    const message = error?.name === 'AbortError'
      ? `Gemini request timed out after ${timeoutMs}ms [model=${getActiveModel()}]`
      : (error?.message || 'unknown error');
    recordGeminiFailure(message);
    logGemini({ label, model: getActiveModel(), ok: false, fallbackUsed: true, durationMs, statusCode: error?.status, note: message });
    return fallbackData;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lightweight end-to-end connectivity probe for GET /api/ai/test.
 * Makes ONE tiny Gemini call and reports success/failure with a safe,
 * key-free message. Updates the shared health state as a side effect.
 *
 * @returns {Promise<{ ok: boolean, mode: string, model: string, response?: any, error?: string }>}
 */
export async function runGeminiTest() {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      mode: 'mock',
      model: getActiveModel(),
      error: 'No GEMINI_API_KEY configured on the server (running in mock mode).',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const prompt = 'Return JSON only: {"ok": true, "message": "Gemini connected"}';
    const text = await callGemini(prompt, controller.signal);
    const parsed = safeParseJSON(text, null);
    if (parsed == null) {
      recordGeminiFailure('Gemini returned unparseable or empty JSON');
      return { ok: false, mode: 'mock', model: getActiveModel(), error: 'Gemini returned unparseable or empty JSON.' };
    }
    recordGeminiSuccess();
    // getActiveModel() reflects any model auto-resolved during the call above.
    return { ok: true, mode: 'live', model: getActiveModel(), response: parsed };
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? `Gemini request timed out after ${REQUEST_TIMEOUT_MS}ms`
      : (error?.message || 'unknown error');
    recordGeminiFailure(message);
    const result = { ok: false, mode: 'mock', model: getActiveModel(), error: message };
    // Best-effort: tell the user which models their key CAN use, so they can set
    // GEMINI_MODEL correctly. Never throws and never logs the key.
    try {
      const available = await listGenerateContentModels();
      if (available.length) result.availableModels = available;
    } catch {
      /* discovery failed too; the error message above is still actionable */
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// 7. MOCK HELPERS - realistic, deterministic fallbacks.
// ============================================================================
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

function mockNextAction(task, risk) {
  const title = (task?.title || 'this task').trim();
  if (risk === 'critical' || risk === 'high') return `Block focused time now and start the hardest part of "${title}".`;
  if (risk === 'attention') return `Knock out "${title}" quickly while it is still small.`;
  return `Take the first small step on "${title}" to build momentum.`;
}

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

/** Trim a task down to the fields the AI actually needs (keeps prompts small). */
function slimTask(task = {}) {
  return {
    id: task.id ?? null,
    title: task.title ?? '',
    category: task.category ?? null,
    deadline: task.deadline ?? null,
    estimatedEffort: task.estimatedEffort ?? null,
    importance: task.importance ?? null,
    status: task.status ?? 'todo',
    riskLevel: task.riskLevel ?? null,
    priorityScore: task.priorityScore ?? null,
  };
}

// ============================================================================
// 8. PUBLIC SERVER API - one function per endpoint. Each builds its prompt and
//    a deterministic mock, then returns generateJSON(prompt, mock).
// ============================================================================

/** Analyze a single task: priority, risk, effort, reasoning, and quick subtasks. */
export async function analyzeTaskOnServer(task = {}) {
  const priorityScore = task?.priorityScore ?? calculatePriorityScore(task);
  const riskLevel = task?.riskLevel ?? getRiskLevel(task);
  const assumptions = [];
  if (task?.estimatedEffort == null) assumptions.push('No effort provided; estimated a default of 1 hour.');
  if (task?.deadline == null) assumptions.push('No deadline provided; treated the task as flexible.');
  if (task?.importance == null) assumptions.push('No importance set; assumed medium importance.');
  const prompt = buildPrompt(TASK_ANALYSIS_PROMPT, slimTask(task));
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
  return generateJSON(prompt, mockResponse);
}

/** Generate an optimized, time-blocked daily plan from tasks + availability. */
export async function generateDailyPlanOnServer(tasks = [], availability = {}) {
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
  const prompt = buildPrompt(DAILY_PLANNER_PROMPT, {
    availability: { startHour, endHour },
    tasks: ranked.map(slimTask),
  });
  const mockResponse = {
    date: new Date().toISOString().slice(0, 10),
    summary: blocks.length
      ? `Planned ${blocks.length} blocks around your highest-priority work - your toughest task is first while energy is high.`
      : 'No open tasks to schedule right now. Enjoy the breathing room or add something new.',
    focusHours,
    blocks,
    assumptions,
  };
  return generateJSON(prompt, mockResponse);
}

/** Break a task into an ordered, actionable checklist. */
export async function breakDownTaskOnServer(task = {}) {
  const prompt = buildPrompt(TASK_BREAKDOWN_PROMPT, slimTask(task));
  const mockResponse = {
    taskId: task?.id ?? null,
    subtasks: mockSubtasks(task).map((title) => ({ title, estimatedEffort: 1 })),
    assumptions: task?.estimatedEffort == null
      ? ['No effort estimate on the task; assumed ~1 hour per step.']
      : [],
  };
  return generateJSON(prompt, mockResponse);
}

/** Replan missed / at-risk tasks into the next available slots. */
export async function rescheduleTasksOnServer(payload = {}) {
  const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  const missedTaskIds = Array.isArray(payload.missedTaskIds) ? payload.missedTaskIds : [];
  const missed = tasks.filter((t) => missedTaskIds.includes(t.id));
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
  const prompt = buildPrompt(RESCHEDULER_PROMPT, { tasks: missed.map(slimTask) });
  const mockResponse = {
    summary: rescheduled.length
      ? `Moved ${rescheduled.length} at-risk task(s) into tonight's open slots and protected your critical deadline.`
      : 'Nothing to reschedule - you are on track.',
    rescheduled,
    assumptions: rescheduled.length ? ['Assumed open evening slots from 18:00 onward.'] : [],
  };
  return generateJSON(prompt, mockResponse);
}

/** Productivity coaching: an encouraging review + concrete recommendations. */
export async function getProductivityCoachingOnServer(context = {}) {
  const stats = isPlainObject(context.stats) ? context.stats : {};
  const tasks = Array.isArray(context.tasks) ? context.tasks : [];
  const question = typeof context.question === 'string' ? context.question.trim() : '';

  const productivityScore = stats.productivityScore ?? 0;
  const completionRate = stats.completionRate ?? 0;

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

  const prompt = buildPrompt(PRODUCTIVITY_COACH_PROMPT, { question: question || null, stats, tasks: tasks.map(slimTask) });
  const assumptions = (Object.keys(stats).length === 0)
    ? ['No productivity stats provided; assumed baseline values.']
    : [];
  const mockResponse = {
    summary: question
      ? `On "${question}": with a ${completionRate}% completion rate and a productivity score of ${productivityScore}, focus your next block on your highest-risk deadline and let the rest flow around it.`
      : `Solid work - a ${completionRate}% completion rate and a productivity score of ${productivityScore} show real consistency.`,
    productivityScore,
    focusRecommendation: 'Protect one 2-hour distraction-free block each day to de-risk your nearest deadline.',
    recommendations,
    strengths: ['Consistent daily habits', 'Strong completion rate'],
    improvements: ['Reduce last-minute crunches', 'Batch quick admin tasks together'],
    assumptions,
  };
  return generateJSON(prompt, mockResponse, { timeoutMs: ASSISTANT_TIMEOUT_MS, label: 'productivity-coach' });
}

/**
 * Context-aware Copilot chat: turn the FULL app context + recent history into a
 * single intelligent natural-language reply.
 *
 * The frontend builds the structured response CARDS locally from live data, so
 * this endpoint deliberately returns ONLY a `reply` string:
 *   - MOCK mode (no key): returns { reply: null } so the client keeps its own
 *     deterministic reply (the offline fallback). The cards are unaffected.
 *   - LIVE mode (key set): asks Gemini for a sharper, context-grounded reply,
 *     steered by the detected `intent`, and falls back to null on any failure.
 *
 * @param {object} payload { message, context, history, intent }
 * @returns {Promise<{ ok:boolean, reply: string|null, intent: string, mode: string, fallbackUsed: boolean, configured: boolean, reason: string|null }>}
 */
const ASSISTANT_INTENTS = new Set(['now', 'feasibility', 'time_box', 'energy', 'insights', 'chat']);

export async function chatWithCopilotOnServer(payload = {}) {
  const intent = ASSISTANT_INTENTS.has(payload.intent) ? payload.intent : 'chat';
  const message = typeof payload.message === 'string' ? payload.message : '';

  // MOCK mode: nothing to enhance - let the client use its local deterministic
  // reply. This is NOT a failure, so reason stays null (the UI shows the normal
  // "Mock AI Mode" badge, not a "Gemini request failed" warning).
  if (!isGeminiConfigured()) {
    return { ok: false, reply: null, intent, mode: 'mock', fallbackUsed: true, configured: false, reason: null };
  }

  const context = isPlainObject(payload.context) ? payload.context : {};
  const history = Array.isArray(payload.history) ? payload.history.slice(-5) : [];
  const guide = ASSISTANT_INTENT_GUIDES[intent] || ASSISTANT_INTENT_GUIDES.chat;

  // Keep the prompt SMALL and focused so the call stays fast and reliable:
  // top pending tasks, the few highest-risk tasks, today's schedule, recent
  // history. (Smaller input => lower latency => fewer timeouts/fallbacks.)
  const pendingTasks = Array.isArray(context.tasks)
    ? sortTasksByPriority(context.tasks.filter((t) => t && t.status !== 'completed')).slice(0, 8).map(slimTask)
    : [];
  const highRiskTasks = Array.isArray(context.highRiskTasks)
    ? context.highRiskTasks.slice(0, 5).map(slimTask)
    : pendingTasks.filter((t) => ['critical', 'high'].includes(t.riskLevel)).slice(0, 5);

  const input = {
    intent,
    guidance: guide,
    message,
    currentTime: typeof context.currentTime === 'string' ? context.currentTime : new Date().toISOString(),
    tasks: pendingTasks,
    highRiskTasks,
    habits: Array.isArray(context.habits) ? context.habits.slice(0, 8) : [],
    scheduleBlocks: Array.isArray(context.scheduleBlocks) ? context.scheduleBlocks.slice(0, 8) : [],
    productivityStats: isPlainObject(context.productivityStats) ? context.productivityStats : {},
    history,
  };

  const prompt = buildPrompt(ASSISTANT_CHAT_PROMPT, input);
  const result = await generateJSON(prompt, { reply: null, intent }, { timeoutMs: ASSISTANT_TIMEOUT_MS, label: 'assistant-chat' });
  const reply = result && typeof result.reply === 'string' && result.reply.trim() ? result.reply.trim() : null;

  // Report the REAL outcome. If the live call failed, generateJSON returned the
  // fallback (reply: null) and health is now "mock" - tell the client (with a
  // safe reason) so the UI can flag a fallback response instead of "live".
  const live = reply != null && getAIMode() === 'live';
  return {
    ok: live,
    reply,
    intent,
    mode: live ? 'live' : 'mock',
    fallbackUsed: !live,
    configured: true,
    reason: live ? null : classifyGeminiReason(geminiHealth.lastError || ''),
  };
}

/**
 * Self-test for GET /api/ai/test-assistant: run a real "what should I do right
 * now?" question through the SAME assistant path the UI uses and report whether
 * a live, non-fallback reply came back. Never throws; never logs the key.
 */
export async function runAssistantSelfTest() {
  const model = getActiveModel();
  if (!isGeminiConfigured()) {
    return { ok: false, mode: 'mock', model, fallbackUsed: true, reason: 'no_key', reply: null,
      error: 'No GEMINI_API_KEY configured on the server (running in mock mode).' };
  }
  const result = await chatWithCopilotOnServer({
    message: 'What should I do right now?',
    intent: 'now',
    context: {
      currentTime: new Date().toISOString(),
      tasks: [
        { id: 't1', title: 'Submit database assignment', deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(), estimatedEffort: 4, importance: 5, status: 'todo', riskLevel: 'critical' },
        { id: 't2', title: 'Prepare for technical interview', deadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(), estimatedEffort: 1, importance: 3, status: 'todo', riskLevel: 'high' },
      ],
    },
    history: [],
  });
  return {
    ok: result.ok === true,
    mode: result.mode,
    model: getActiveModel(),
    fallbackUsed: result.fallbackUsed === true,
    reason: result.ok ? null : (result.reason || 'fallback'),
    reply: result.reply,
  };
}
