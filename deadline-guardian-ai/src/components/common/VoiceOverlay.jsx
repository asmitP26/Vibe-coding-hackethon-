import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Loader2, Square } from 'lucide-react';
import { useVoice } from '../../context/VoiceContext';
import { cn } from '../../lib/cn';

/**
 * VoiceOverlay - a small, global status pill shown while a voice command is
 * being captured ("Listening…") or routed ("Processing…"). It echoes the live
 * transcript so users get instant feedback.
 *
 * Final outcomes (success / unclear-command fallback / errors) are delivered
 * through the app Toast, so this overlay stays focused on the in-flight states
 * and never overlaps the result toast.
 */
export default function VoiceOverlay() {
  const { transcript, listening, processing, stop } = useVoice();
  const visible = listening || processing;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-40 z-[55] flex justify-center px-4 lg:bottom-24">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="voice-overlay"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-slate-900/95 px-4 py-3 text-white shadow-glow ring-1 ring-white/10 backdrop-blur"
          >
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
              {listening ? (
                <>
                  <motion.span
                    className="absolute inset-0 rounded-xl bg-brand-400/40"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 1.3, repeat: Infinity }}
                  />
                  <Mic className="h-5 w-5" />
                </>
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-200">
                {listening ? 'Listening…' : 'Processing…'}
              </p>
              <p className={cn('truncate text-sm', transcript ? 'text-white' : 'text-white/50')}>
                {transcript || 'Say a command, e.g. "plan my day"'}
              </p>
            </div>

            {listening && (
              <button
                type="button"
                onClick={stop}
                aria-label="Stop listening"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
