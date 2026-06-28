import { Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVoice } from '../../context/VoiceContext';
import { cn } from '../../lib/cn';

/**
 * MicButton - the shared voice trigger used in the Topbar, the floating
 * assistant panel, and the Assistant page. Every instance toggles the same
 * global voice session (VoiceContext), so the live transcript + status overlay
 * behave identically wherever it is placed.
 *
 * When voice is unsupported the button stays clickable on purpose: tapping it
 * surfaces a friendly "not supported" message instead of silently doing nothing.
 */
export default function MicButton({ className, size = 'md', title = 'Voice command' }) {
  const { toggle, listening, supported } = useVoice();
  const dims = size === 'lg' ? 'h-11 w-11' : 'h-10 w-10';
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={title}
      aria-pressed={listening}
      title={supported ? title : 'Voice input is not supported in this browser'}
      className={cn(
        'relative grid shrink-0 place-items-center rounded-xl border transition-colors',
        dims,
        listening
          ? 'border-brand-200 bg-brand-50 text-brand-600'
          : 'border-slate-200 bg-white text-slate-500 hover:text-brand-600',
        !supported && 'opacity-60',
        className,
      )}
    >
      {listening && (
        <motion.span
          className="absolute inset-0 rounded-xl bg-brand-400/30"
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}
      <Mic className={cn(iconSize, listening && 'animate-pulse')} />
    </button>
  );
}
