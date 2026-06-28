import { cn } from '../../lib/cn';

/**
 * Skeleton - shimmering placeholder block for loading states.
 * A soft slate base with a sweeping highlight (animate-shimmer) for a premium,
 * "content is loading" feel rather than a flat pulse.
 */
export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-xl bg-slate-200/70', className)}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

/** SkeletonText - a stack of shrinking lines that mimics a paragraph. */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: `${92 - i * 12}%` }} />
      ))}
    </div>
  );
}

/** SkeletonCircle - a round placeholder for avatars/icons. */
export function SkeletonCircle({ className }) {
  return <Skeleton className={cn('rounded-full', className)} />;
}
