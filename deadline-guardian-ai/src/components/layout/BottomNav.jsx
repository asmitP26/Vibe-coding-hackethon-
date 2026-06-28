import { NavLink } from 'react-router-dom';
import { mobileNavItems } from './navItems';
import { cn } from '../../lib/cn';

/** Mobile bottom navigation - hidden on large screens. */
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/90 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
        {mobileNavItems.map(({ to, label, shortLabel, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl transition-colors',
                    isActive && 'bg-brand-50',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {shortLabel || label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
