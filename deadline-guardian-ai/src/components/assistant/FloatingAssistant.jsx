import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import AssistantPanel from './AssistantPanel';

/** Floating circular AI button (bottom-right) + popover. Visible app-wide. */
export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      <AnimatePresence>
        {open && <AssistantPanel key="panel" onClose={() => setOpen(false)} />}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-glow"
      >
        {!open && (
          <span className="absolute inset-0 animate-pulseRing rounded-full bg-brand-500/40" />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'x' : 'spark'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
