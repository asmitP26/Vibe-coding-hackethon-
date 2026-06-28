import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';

/**
 * Reveals `text` one chunk at a time for a lightweight "AI is typing" effect.
 *
 * - When `animate` is false (or the user prefers reduced motion) the full text
 *   shows immediately and `onComplete` fires on mount.
 * - Otherwise the text is revealed on an interval, scaling the step size so long
 *   replies finish in roughly the same time as short ones.
 *
 * Props:
 *   text       - string to reveal (defaults to '').
 *   animate    - whether to run the reveal animation.
 *   speed      - interval in ms between reveal steps (default 14).
 *   onComplete - called once the full text is visible.
 *   className  - passed to the wrapping <span>.
 */
export default function TypewriterText({ text = '', animate = false, speed = 14, onComplete, className }) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion && text.length > 0;
  const [count, setCount] = useState(shouldAnimate ? 0 : text.length);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!shouldAnimate) {
      setCount(text.length);
      onCompleteRef.current?.();
      return undefined;
    }

    setCount(0);
    // Reveal several characters per tick so long messages don't crawl.
    const step = Math.max(1, Math.round(text.length / 120));
    let current = 0;
    const id = setInterval(() => {
      current = Math.min(text.length, current + step);
      setCount(current);
      if (current >= text.length) {
        clearInterval(id);
        onCompleteRef.current?.();
      }
    }, speed);

    return () => clearInterval(id);
    // Re-run only when the text or animation flag changes.
  }, [text, shouldAnimate, speed]);

  const typing = shouldAnimate && count < text.length;

  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {text.slice(0, count)}
      {typing && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] -translate-y-px animate-pulse rounded-full bg-current align-middle opacity-70" />
      )}
    </span>
  );
}
