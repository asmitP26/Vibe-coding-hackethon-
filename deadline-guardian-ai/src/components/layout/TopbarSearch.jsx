import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  ListChecks,
  Target,
  CalendarDays,
  Sparkles,
  CornerDownLeft,
  SearchX,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePopover } from '../../hooks/usePopover';
import { searchEverything } from '../../services/globalSearch';
import { cn } from '../../lib/cn';

// Per-group icon shown in the dropdown headers and result rows.
const GROUP_ICONS = {
  tasks: ListChecks,
  habits: Target,
  planner: CalendarDays,
  assistant: Sparkles,
};

/**
 * TopbarSearch - global search across tasks, habits, schedule blocks, and
 * assistant messages. Shows grouped, ranked results in a dropdown; clicking (or
 * pressing Enter on) a result navigates to the right page. Escape closes it.
 */
export default function TopbarSearch() {
  const navigate = useNavigate();
  const { tasks, habits, scheduleBlocks, assistantConversation } = useApp();
  const { open, setOpen, close, ref } = usePopover(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () =>
      searchEverything(
        { tasks, habits, scheduleBlocks, assistantMessages: assistantConversation },
        query,
      ),
    [tasks, habits, scheduleBlocks, assistantConversation, query],
  );

  // Visual (and keyboard-navigation) order = groups concatenated in display order.
  const visibleItems = useMemo(() => results.groups.flatMap((g) => g.items), [results]);
  const showDropdown = open && query.trim().length > 0;

  const handleChange = (e) => {
    setQuery(e.target.value);
    setActiveIndex(0);
    setOpen(true);
  };

  const go = (item) => {
    if (!item) return;
    setQuery('');
    setActiveIndex(0);
    close();
    navigate(item.to);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
      e.currentTarget.blur();
      return;
    }
    if (!visibleItems.length) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      go(visibleItems[activeIndex] || visibleItems[0]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % visibleItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + visibleItems.length) % visibleItems.length);
    }
  };

  return (
    <div ref={ref} className="relative hidden flex-1 md:block md:max-w-md">
      <label
        className={cn(
          'flex items-center gap-2.5 rounded-xl border bg-white px-3.5 py-2 text-slate-500 transition-colors',
          showDropdown ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-200',
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks, habits, plans..."
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          aria-label="Search tasks, habits, plans and assistant"
          autoComplete="off"
        />
        <kbd className="hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 lg:inline">
          Esc
        </kbd>
      </label>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-glow backdrop-blur-xl"
          >
            {results.total === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <SearchX className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-slate-600">
                  No matching tasks, habits, or plans found.
                </p>
                <p className="text-xs text-slate-400">Try a different keyword.</p>
              </div>
            ) : (
              <>
                {results.groups.map((group) => {
                  const GroupIcon = GROUP_ICONS[group.key] || Search;
                  return (
                    <div key={group.key} className="mb-1 last:mb-0">
                      <div className="flex items-center gap-2 px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        <GroupIcon className="h-3.5 w-3.5" />
                        {group.label}
                      </div>
                      {group.items.map((item) => {
                        const flatIndex = visibleItems.indexOf(item);
                        const isActive = flatIndex === activeIndex;
                        return (
                          <button
                            key={`${group.key}-${item.id}`}
                            type="button"
                            onClick={() => go(item)}
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                            className={cn(
                              'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                              isActive ? 'bg-brand-50' : 'hover:bg-slate-50',
                            )}
                          >
                            <span
                              className={cn(
                                'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
                                isActive ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
                              )}
                            >
                              <GroupIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-800">
                                {item.title}
                              </span>
                              {item.subtitle && (
                                <span className="block truncate text-xs text-slate-400">
                                  {item.subtitle}
                                </span>
                              )}
                            </span>
                            {isActive && (
                              <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                <p className="border-t border-slate-100 px-2.5 pt-2 text-[11px] text-slate-400">
                  {results.total} result{results.total === 1 ? '' : 's'} · Enter to open · Esc to close
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
