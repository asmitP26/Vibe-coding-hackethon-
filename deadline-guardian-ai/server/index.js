/*
 * Deadline Guardian AI - secure backend server.
 *
 * SECURE ARCHITECTURE:  React Frontend -> Backend API Route -> Gemini API
 *   This Express server is the ONLY component that holds the Gemini API key
 *   (process.env.GEMINI_API_KEY). The browser never receives it. The frontend
 *   calls our /api/ai/* routes; this server calls Google on its behalf.
 *
 * Run:
 *   - Dev:        npm run dev:server   (or npm run dev for client + server)
 *   - Production: npm start
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/aiRoutes.js';
import { isGeminiConfigured, getGeminiModel } from './services/geminiServerService.js';

// Resolve the built frontend (dist/) relative to this file so it works from any
// working directory (local, Docker, Cloud Run buildpacks).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

// Safety net: a stray rejected promise is logged, never allowed to crash the
// process (otherwise Cloud Run would restart the container).
process.on('unhandledRejection', (reason) => {
  console.warn(`[server] Unhandled promise rejection: ${reason?.message || reason}`);
});

const app = express();
// Cloud Run / AI Studio inject their own PORT; default to 8080 for production.
// Local dev can override via .env (e.g. PORT=3001) and the Vite proxy follows it.
const PORT = process.env.PORT || 8080;

// --- CORS ---------------------------------------------------------------------
// Allow the local Vite dev server and, in production, an explicit deployed
// origin via CLIENT_ORIGIN. Requests with no Origin (same-origin, curl, the
// Vite dev proxy) are always allowed.
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
const allowedOrigins = new Set(DEV_ORIGINS);
if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.add(process.env.CLIENT_ORIGIN.trim());
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / no-origin requests (the production SPA is served by
      // THIS server, plus curl and uptime probes) and explicitly allow-listed
      // dev origins (the Vite dev server on another port). For any other origin
      // we omit CORS headers instead of throwing: same-origin POSTs still carry
      // an Origin header but the browser never enforces CORS on them, so they
      // must succeed - while genuine cross-origin callers are still blocked
      // client-side because no Access-Control-Allow-Origin is returned.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  }),
);

// --- Body parsing -------------------------------------------------------------
// SECURITY_NOTE: cap the body size to reject oversized / abusive payloads.
app.use(express.json({ limit: '100kb' }));

// --- Routes -------------------------------------------------------------------
// Deployment health probe (used by Cloud Run / uptime checks). Works with or
// without a Gemini key.
app.get('/health', (req, res) =>
  res.json({ ok: true, service: 'Deadline Guardian AI', mode: 'production-ready' }),
);
app.use('/api/ai', aiRoutes);

// --- Static frontend (production) ---------------------------------------------
// Serve the built React app and let client-side routing handle deep links.
// Registered AFTER the API routes so /api/* and /health always win. In dev the
// Vite server serves the frontend, so an absent dist/ here is harmless.
app.use(express.static(DIST_DIR));

// SPA fallback: any non-API GET returns index.html so routes like /dashboard,
// /assistant and /planner work on direct load and refresh (no 404).
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next(); // never mask unknown API routes
  if (!existsSync(INDEX_HTML)) {
    return res.status(503).json({
      error: 'Frontend build not found. Run "npm run build" before "npm start".',
    });
  }
  return res.sendFile(INDEX_HTML);
});

// --- Error handling -----------------------------------------------------------
// Turn body-parser / CORS errors into clean JSON instead of crashing.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload is too large.' });
  }
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  // Log a safe message only - never secrets or the API key.
  console.warn(`[server] Unhandled error: ${err?.message || 'unknown error'}`);
  return res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  // Safe to log the mode, model, and port; the key itself is NEVER logged.
  // "configured" means a real key is present - actual liveness is confirmed by
  // the first request (or GET /api/ai/test) and reflected at GET /api/ai/status.
  const configured = isGeminiConfigured();
  const mode = configured ? `LIVE-capable (model: ${getGeminiModel()})` : 'MOCK (no key)';
  console.log(`Deadline Guardian AI running on port ${PORT}  |  AI mode: ${mode}`);
  if (configured) {
    console.log('[server] Verify Gemini connectivity:  GET /api/ai/test');
  }
});
