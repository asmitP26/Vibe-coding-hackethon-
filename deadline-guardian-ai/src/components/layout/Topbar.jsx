import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Bell } from 'lucide-react';
import Button from '../common/Button';
import AIModeBadge from '../common/AIModeBadge';
import MicButton from '../common/MicButton';
import Logo from './Logo';
import { useApp } from '../../context/AppContext';

export default function Topbar() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [query, setQuery] = useState('');

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="lg:hidden">
        <Logo compact />
      </div>

      <label className="hidden flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-500 md:flex md:max-w-md">
        <Search className="h-4 w-4" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks, goals, notes..."
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          aria-label="Search"
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <AIModeBadge className="hidden sm:inline-flex" />
        <Button onClick={() => navigate('/planner')} className="hidden sm:inline-flex">
          <Sparkles className="h-4 w-4" />
          Plan My Day
        </Button>

        <MicButton title="Voice command" />

        <button
          aria-label="Notifications"
          className="relative hidden h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-brand-600 sm:grid"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-bold text-white">
          {user.initials}
        </span>
      </div>
    </header>
  );
}
