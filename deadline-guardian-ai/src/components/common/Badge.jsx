import { cn } from '../../lib/cn';

/**
 * Badge - small status/label pill.
 * Pass full Tailwind class strings via `className` (e.g. from uiMeta), and
 * optionally a `dot` color class for a leading status dot.
 */
export default function Badge({ className, dot, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        className || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}
