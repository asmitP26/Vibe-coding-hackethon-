import { NavLink } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { navItems } from './navItems';
import { cn } from '../../lib/cn';
import { useApp } from '../../context/AppContext';
import Logo from './Logo';

export default function Sidebar() {
  const { user } = useApp();

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

      <div className="mt-auto flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 p-4 text-white">
          <Sparkles className="absolute -right-3 -top-3 h-16 w-16 text-white/10" />
          <p className="text-sm font-semibold">Productivity Copilot</p>
          <p className="mt-1 text-xs text-white/80">
            Let AI plan, prioritize, and replan your day automatically.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-bold text-white">
            {user.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.plan} plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
