import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/cn';

/**
 * Toast - a single, non-blocking notification driven by AppContext.
 * Call `showToast(message, tone)` from anywhere; tone is one of
 * "success" | "warning" | "info". Auto-dismisses after a few seconds.
 */
const TONES = {
  success: { icon: CheckCircle2, surface: 'bg-emerald-600 text-white', ring: 'ring-emerald-500/30' },
  warning: { icon: AlertTriangle, surface: 'bg-amber-500 text-white', ring: 'ring-amber-400/30' },
  info: { icon: Info, surface: 'bg-slate-900 text-white', ring: 'ring-slate-700/40' },
};

export default function Toast() {
  const { toast, dismissToast } = useApp();
  const meta = TONES[toast?.tone] || TONES.info;
  const Icon = meta.icon;
  const actions = Array.isArray(toast?.actions) ? toast.actions : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            role="status"
            aria-live="polite"
            className={cn(
              'pointer-events-auto flex max-w-md flex-col gap-2 rounded-2xl px-4 py-3 shadow-glow ring-1',
              meta.surface,
              meta.ring,
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                onClick={dismissToast}
                aria-label="Dismiss notification"
                className="ml-auto rounded-lg p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {actions && actions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pl-8">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      try {
                        action.onClick();
                      } finally {
                        dismissToast();
                      }
                    }}
                    className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/25"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
