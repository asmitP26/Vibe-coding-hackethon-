import { useEffect, useState } from 'react';
import { fetchAIStatus, getAIStatus } from '../../services/geminiService';
import { cn } from '../../lib/cn';

/**
 * AIModeBadge - tiny pill showing whether the AI layer is live or mocked.
 *   - "Gemini Live via Secure Backend" (green, pulsing dot) when the backend
 *     reports it has a Gemini key configured (mode === "live").
 *   - "Mock AI Mode" (slate) when the backend has no key or is unreachable.
 *
 * SECURE ARCHITECTURE: the mode comes from the backend's GET /api/ai/status -
 * the browser never sees the API key, only whether live mode is active.
 */
export default function AIModeBadge({ className }) {
  const [status, setStatus] = useState(() => getAIStatus());

  useEffect(() => {
    let active = true;
    fetchAIStatus()
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch(() => {
        /* fetchAIStatus never throws by design; stay in the current (mock) mode. */
      });
    return () => {
      active = false;
    };
  }, []);

  const live = status.mode === 'live';
  // Configured but not live = a real key is set, yet the last Gemini call
  // failed (e.g. wrong model / quota / network) and we fell back to mock.
  const fallback = !live && status.configured === true;

  const label = live ? 'Gemini Live via Secure Backend' : fallback ? 'AI Fallback (Mock)' : 'Mock AI Mode';
  const title = live
    ? 'Gemini connected via a secure backend proxy - the API key stays on the server'
    : fallback
      ? `Gemini key is set but the last call failed - using the built-in mock.${status.lastError ? ` (${status.lastError})` : ''}`
      : 'No server API key (or backend offline) - using the built-in mock AI';

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        live
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : fallback
            ? 'bg-amber-50 text-amber-700 ring-amber-200'
            : 'bg-slate-100 text-slate-500 ring-slate-200',
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            live ? 'animate-ping bg-emerald-400' : fallback ? 'bg-amber-400' : 'bg-slate-300',
          )}
        />
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            live ? 'bg-emerald-500' : fallback ? 'bg-amber-500' : 'bg-slate-400',
          )}
        />
      </span>
      {label}
    </span>
  );
}
