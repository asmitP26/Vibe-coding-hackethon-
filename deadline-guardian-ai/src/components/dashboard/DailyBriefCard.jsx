import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

/** AI Daily Brief - hero summary card with a soft gradient. */
export default function DailyBriefCard() {
  const { dailyBrief } = useApp();
  const navigate = useNavigate();
  const summary = dailyBrief?.summary || "Here's your day at a glance. Plan it to get ahead of every deadline.";
  const highlights = Array.isArray(dailyBrief?.highlights) ? dailyBrief.highlights : [];

  return (
    <motion.div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-700 p-6 text-white shadow-glow"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Sparkles className="absolute -right-6 -top-6 h-32 w-32 text-white/10" />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm font-medium text-white/80">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15">
            <Sparkles className="h-4 w-4" />
          </span>
          AI Daily Brief
        </div>

        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/95">
          {summary}
        </p>

        <ul className="mt-4 flex flex-wrap gap-2">
          {highlights.map((h) => (
            <li
              key={h}
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur"
            >
              {h}
            </li>
          ))}
        </ul>

        <button
          onClick={() => navigate('/planner')}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition-transform hover:scale-[1.02]"
        >
          <Sparkles className="h-4 w-4" />
          Plan My Day
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
