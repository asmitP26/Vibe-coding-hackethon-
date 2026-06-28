import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';
import { cn } from '../../lib/cn';
import { useApp } from '../../context/AppContext';
import Logo from './Logo';

export default function Sidebar() {
  const { user, preferences } = useApp();

  // Reflect the user's edited display name (falls back to the demo identity).
  const displayName = preferences?.displayName?.trim() || user.name || 'Asmit';
  const parts = displayName.split(/\s+/).filter(Boolean);
  const initials = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : displayName[0] || 'A').toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-slate-200/60 bg-gradient-to-b from-white/80 via-white/60 to-white/40 px-4 py-6 backdrop-blur-2xl lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-bold text-white">
            {initials}
          </span>
          <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{displayName}</p>
        </div>
      </div>
    </aside>
  );
}
