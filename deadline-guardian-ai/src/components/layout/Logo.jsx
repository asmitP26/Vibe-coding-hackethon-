import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Brand lockup used in the sidebar, landing nav, and mobile topbar. */
export default function Logo({ to = '/', compact = false, className }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-glow">
        <ShieldCheck className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-extrabold tracking-tight text-slate-900">
            Deadline Guardian
          </span>
          <span className="block text-[11px] font-medium text-brand-600">AI Companion</span>
        </span>
      )}
    </Link>
  );
}
