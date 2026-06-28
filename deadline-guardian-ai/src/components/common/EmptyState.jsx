import { cn } from '../../lib/cn';

/**
 * EmptyState - friendly placeholder for empty lists/sections.
 * Pass a lucide `icon`, a `title`, optional `description`, and an `action` node.
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
