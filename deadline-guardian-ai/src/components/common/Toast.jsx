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
              'pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-glow ring-1',
              meta.surface,
              meta.ring,
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={dismissToast}
              aria-label="Dismiss notification"
              className="ml-1 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
