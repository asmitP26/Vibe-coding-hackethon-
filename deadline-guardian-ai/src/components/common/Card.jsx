import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/**
 * Card - the base surface for the whole UI.
 * Pass `hover` for a subtle lift, `as={motion.div}`-style props pass through.
 */
export default function Card({ className, hover = false, children, ...props }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cn(
        'card p-5 sm:p-6',
        hover && 'transition-colors duration-200 hover:border-brand-100 hover:shadow-soft',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Small labelled section header used inside cards. */
export function CardHeader({ icon: Icon, title, subtitle, action, iconClass }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className={cn(
              'grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600',
              iconClass,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
