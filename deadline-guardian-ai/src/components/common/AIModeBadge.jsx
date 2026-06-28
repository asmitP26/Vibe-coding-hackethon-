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
  const [mode, setMode] = useState(() => getAIStatus().mode);

  useEffect(() => {
    let active = true;
    fetchAIStatus()
      .then((status) => {
        if (active) setMode(status.mode);
      })
      .catch(() => {
        /* fetchAIStatus never throws by design; stay in the current (mock) mode. */
      });
    return () => {
      active = false;
    };
  }, []);

  const live = mode === 'live';
  return (
    <span
      title={
        live
          ? 'Gemini connected via a secure backend proxy - the API key stays on the server'
          : 'No server API key (or backend offline) - using the built-in mock AI'
      }
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        live
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-slate-100 text-slate-500 ring-slate-200',
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            live ? 'animate-ping bg-emerald-400' : 'bg-slate-300',
          )}
        />
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            live ? 'bg-emerald-500' : 'bg-slate-400',
          )}
        />
      </span>
      {live ? 'Gemini Live via Secure Backend' : 'Mock AI Mode'}
    </span>
  );
}
