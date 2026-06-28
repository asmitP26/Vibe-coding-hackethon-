import { CalendarDays, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getBlockMeta } from '../../utils/uiMeta';
import { cn } from '../../lib/cn';

/** Dark premium calendar/agenda preview card. */
export default function CalendarPreviewCard() {
  const { scheduleBlocks } = useApp();
  const navigate = useNavigate();
  const blocks = (Array.isArray(scheduleBlocks) ? scheduleBlocks : []).slice(0, 4);

  const today = new Date();
  const weekday = today.toLocaleDateString(undefined, { weekday: 'long' });
  const dayNum = today.getDate();
  const month = today.toLocaleDateString(undefined, { month: 'long' });

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-card">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Today's Schedule</p>
              <p className="text-xs text-white/60">
                {weekday}, {month} {dayNum}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/planner')}
            aria-label="Open planner"
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white/80 transition-colors hover:bg-white/20"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2.5">
          {blocks.length === 0 ? (
            <p className="rounded-2xl bg-white/[0.06] px-3 py-4 text-center text-sm text-white/60 ring-1 ring-white/5">
              Nothing scheduled yet. Plan your day to fill this in.
            </p>
          ) : (
            blocks.map((b) => {
              const meta = getBlockMeta(b.type);
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/5"
                >
                  <div className="w-12 shrink-0 text-right">
                    <p className="text-xs font-semibold text-white">{b.start}</p>
                    <p className="text-[10px] text-white/40">{b.end}</p>
                  </div>
                  <span className={cn('h-9 w-1 rounded-full', meta.bar)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/95">{b.title}</p>
                    <p className="text-[11px] capitalize text-white/50">{meta.label}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
