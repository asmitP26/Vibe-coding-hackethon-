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
import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/aiRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

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
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  }),
);

// --- Body parsing -------------------------------------------------------------
// SECURITY_NOTE: cap the body size to reject oversized / abusive payloads.
app.use(express.json({ limit: '100kb' }));

// --- Routes -------------------------------------------------------------------
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/ai', aiRoutes);

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
  const mode = process.env.GEMINI_API_KEY ? 'LIVE (Gemini)' : 'MOCK (no key)';
  // Safe to log the mode and port; the key itself is never logged.
  console.log(`[server] Deadline Guardian AI backend listening on http://localhost:${PORT}  |  AI mode: ${mode}`);
});
