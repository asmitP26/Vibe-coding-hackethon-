import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import AssistantResponseCards from './AssistantResponseCards';
import TypewriterText from './TypewriterText';
import { cn } from '../../lib/cn';

/**
 * Renders a single assistant message: a chat bubble whose text can type itself
 * out, followed by structured response cards that fade in once typing finishes.
 *
 * Props:
 *   message         - { content, cards } assistant message object.
 *   animate         - whether this message should animate (typing + card reveal).
 *   onTyped         - called once the typing animation completes.
 *   bubbleClassName - classes for the text bubble.
 *   cardsClassName  - optional wrapper classes for the cards block.
 */
export default function AssistantMessage({ message, animate = false, onTyped, bubbleClassName, cardsClassName }) {
  const reduceMotion = useReducedMotion();
  const willAnimate = animate && !reduceMotion;
  // Cards are hidden until typing finishes (only when actually animating).
  const [revealed, setRevealed] = useState(!willAnimate);
  const cards = message?.cards || [];

  const handleComplete = () => {
    setRevealed(true);
    onTyped?.();
  };

  return (
    <div className={cn('min-w-0', cardsClassName)}>
      <div className={bubbleClassName}>
        <TypewriterText text={message?.content || ''} animate={willAnimate} onComplete={handleComplete} />
      </div>
      <AnimatePresence>
        {revealed && cards.length > 0 && (
          <motion.div
            initial={willAnimate ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <AssistantResponseCards cards={cards} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
