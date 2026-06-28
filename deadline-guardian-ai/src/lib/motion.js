/*
 * Shared Framer Motion variants for consistent, subtle entrance animations.
 * Use `staggerContainer` on a wrapper with `initial="hidden" animate="show"`,
 * and `fadeInUp` on each child for a premium staggered reveal.
 */

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4 } },
};
