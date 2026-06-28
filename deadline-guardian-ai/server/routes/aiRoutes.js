/*
 * aiRoutes - the secure AI proxy endpoints.
 *
 * SECURE ARCHITECTURE:  Frontend -> Backend API Route (this file) -> Gemini API
 *   The frontend POSTs plain JSON here. We validate it, call the server-side
 *   Gemini service, and return clean JSON. The Gemini API key stays on the
 *   server and is never exposed to or required by the browser.
 *
 * Every handler is wrapped so a bad payload or unexpected error returns a JSON
 * error (or a safe fallback) instead of crashing the server.
 */
import { Router } from 'express';
import {
  analyzeTaskOnServer,
  generateDailyPlanOnServer,
  breakDownTaskOnServer,
  rescheduleTasksOnServer,
  getProductivityCoachingOnServer,
  chatWithCopilotOnServer,
  getAIMode,
  isGeminiConfigured,
} from '../services/geminiServerService.js';

const router = Router();

// --- Basic request validation -------------------------------------------------
// SECURITY_NOTE: defense-in-depth. The body size is also capped by express.json
// in index.js; these checks ensure required fields exist and shapes are sane.
const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** Wrap an async handler so thrown errors become a safe JSON 500, never a crash. */
function safeHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      // Log a safe message only - never the API key or full user payload.
      console.warn(`[aiRoutes] ${req.method} ${req.path} failed: ${err?.message || 'unknown error'}`);
      res.status(500).json({ error: 'AI request could not be processed.' });
    }
  };
}

/** Reject obviously malformed bodies early with a 400. */
function requireObjectBody(req, res) {
  if (!isObject(req.body)) {
    res.status(400).json({ error: 'Request body must be a JSON object.' });
    return false;
  }
  return true;
}

// --- Status -------------------------------------------------------------------
// GET /api/ai/status -> drives the frontend "AI mode" badge.
router.get('/status', (req, res) => {
  res.json({
    mode: getAIMode(), // "live" | "mock"
    provider: 'Google Gemini',
    secureProxy: true,
  });
});

// --- POST /api/ai/analyze-task ------------------------------------------------
router.post(
  '/analyze-task',
  safeHandler(async (req, res) => {
    if (!requireObjectBody(req, res)) return;
    const task = isObject(req.body.task) ? req.body.task : req.body;
    if (!task.title || typeof task.title !== 'string') {
      res.status(400).json({ error: 'A task with a "title" string is required.' });
      return;
    }
    const result = await analyzeTaskOnServer(task);
    res.json(result);
  }),
);

// --- POST /api/ai/generate-daily-plan -----------------------------------------
router.post(
  '/generate-daily-plan',
  safeHandler(async (req, res) => {
    if (!requireObjectBody(req, res)) return;
    const tasks = Array.isArray(req.body.tasks) ? req.body.tasks : [];
    const availability = isObject(req.body.availability) ? req.body.availability : {};
    const result = await generateDailyPlanOnServer(tasks, availability);
    res.json(result);
  }),
);

// --- POST /api/ai/break-down-task ---------------------------------------------
router.post(
  '/break-down-task',
  safeHandler(async (req, res) => {
    if (!requireObjectBody(req, res)) return;
    const task = isObject(req.body.task) ? req.body.task : req.body;
    if (!task.title || typeof task.title !== 'string') {
      res.status(400).json({ error: 'A task with a "title" string is required.' });
      return;
    }
    const result = await breakDownTaskOnServer(task);
    res.json(result);
  }),
);

// --- POST /api/ai/reschedule-tasks --------------------------------------------
router.post(
  '/reschedule-tasks',
  safeHandler(async (req, res) => {
    if (!requireObjectBody(req, res)) return;
    const tasks = Array.isArray(req.body.tasks) ? req.body.tasks : [];
    const missedTaskIds = Array.isArray(req.body.missedTaskIds) ? req.body.missedTaskIds : [];
    const result = await rescheduleTasksOnServer({ tasks, missedTaskIds });
    res.json(result);
  }),
);

// --- POST /api/ai/productivity-coach ------------------------------------------
router.post(
  '/productivity-coach',
  safeHandler(async (req, res) => {
    if (!requireObjectBody(req, res)) return;
    const stats = isObject(req.body.stats) ? req.body.stats : {};
    const tasks = Array.isArray(req.body.tasks) ? req.body.tasks : [];
    const question = typeof req.body.question === 'string' ? req.body.question : '';
    const result = await getProductivityCoachingOnServer({ stats, tasks, question });
    res.json(result);
  }),
);

// --- POST /api/ai/assistant-chat ----------------------------------------------
// Context-aware Copilot reply. Receives the full app context + recent history
// and returns a single intelligent `reply` string (the frontend renders the
// structured cards itself). Returns { reply: null } in mock mode so the client
// keeps its own deterministic fallback reply.
router.post(
  '/assistant-chat',
  safeHandler(async (req, res) => {
    if (!requireObjectBody(req, res)) return;
    const message = typeof req.body.message === 'string' ? req.body.message : '';
    if (!message.trim()) {
      res.status(400).json({ error: 'A "message" string is required.' });
      return;
    }
    const context = isObject(req.body.context) ? req.body.context : {};
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const intent = typeof req.body.intent === 'string' ? req.body.intent : 'chat';
    const result = await chatWithCopilotOnServer({ message, context, history, intent });
    res.json(result);
  }),
);

export default router;
export { isGeminiConfigured };
