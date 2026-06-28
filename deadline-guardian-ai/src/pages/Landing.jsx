import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Brain,
  CalendarClock,
  BellRing,
  ListTree,
  Target,
  Mic,
  RefreshCw,
  BarChart3,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Logo from '../components/layout/Logo';
import Button from '../components/common/Button';
import GradientOrbs from '../components/layout/GradientOrbs';

const FEATURES = [
  { icon: Brain, title: 'AI Priority Engine', desc: 'Smart scoring ranks every task by importance, urgency, and effort.', tone: 'from-brand-500 to-indigo-500' },
  { icon: CalendarClock, title: 'Smart Time Planner', desc: 'Auto-builds a focused, time-blocked day around your deadlines.', tone: 'from-indigo-500 to-violet-500' },
  { icon: BellRing, title: 'Context-Aware Nudges', desc: 'Proactive reminders that adapt to risk, not just the clock.', tone: 'from-sky-500 to-brand-500' },
  { icon: ListTree, title: 'Break-It-Down Agent', desc: 'Turns overwhelming tasks into clear, doable subtasks instantly.', tone: 'from-emerald-500 to-teal-500' },
  { icon: Target, title: 'Goal & Habit Tracker', desc: 'Build streaks and routines that keep deadlines stress-free.', tone: 'from-violet-500 to-fuchsia-500' },
  { icon: Mic, title: 'Voice Assistant', desc: 'Talk to your companion—add tasks and ask what to do next.', tone: 'from-amber-500 to-orange-500' },
  { icon: RefreshCw, title: 'Auto-Replan Agent', desc: 'Missed a block? The plan reshuffles itself automatically.', tone: 'from-rose-500 to-red-500' },
  { icon: BarChart3, title: 'Productivity Insights', desc: 'See momentum, risks, and patterns with beautiful analytics.', tone: 'from-cyan-500 to-blue-500' },
];

const WORKFLOW = [
  { icon: CheckCircle2, label: 'You add a task' },
  { icon: Brain, label: 'AI analyzes priority & risk' },
  { icon: ListTree, label: 'Breaks it into subtasks' },
  { icon: CalendarClock, label: 'Schedules focus blocks' },
  { icon: ShieldCheck, label: 'Monitors deadline risk' },
  { icon: RefreshCw, label: 'Replans when life happens' },
];

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <GradientOrbs />

      {/* Hero glow orb - animated breathing blue glow behind the headline */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.12, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-1/2 top-20 -z-10 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-indigo-500 blur-[130px]"
      />

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block">
            Dashboard
          </Link>
          <Link to="/dashboard">
            <Button size="sm">
              Launch App <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 pb-16 pt-12 text-center sm:pt-20">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-soft"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Your proactive AI deadline companion
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl"
        >
          Never miss a <span className="text-gradient">deadline</span> again.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg"
        >
          Deadline Guardian AI plans, prioritizes, reminds, and helps you finish before
          time runs out—so you can focus on the work that matters.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" block>
              Launch Dashboard <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <a href="#workflow" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" block>
              See AI Workflow
            </Button>
          </a>
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Saves 5+ hrs / week</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Risk-aware scheduling</span>
          <span className="flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Powered by Gemini</span>
        </div>
      </section>

      {/* Product preview */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-[28px] border border-white/60 bg-white/70 p-3 shadow-card backdrop-blur"
        >
          <div className="rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Good evening, Asmit</p>
                  <p className="text-xs text-white/50">3 tasks at risk · 1 critical deadline today</p>
                </div>
              </div>
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
                Critical: Hackathon MVP
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { k: 'Priority Score', v: '94', s: 'Hackathon MVP' },
                { k: 'Focus Hours', v: '6.5h', s: 'planned today' },
                { k: 'Completion', v: '78%', s: 'this week' },
              ].map((c) => (
                <div key={c.k} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <p className="text-xs text-white/50">{c.k}</p>
                  <p className="mt-1 text-2xl font-extrabold">{c.v}</p>
                  <p className="text-[11px] text-white/40">{c.s}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features bento */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Everything you need to beat deadlines
          </h2>
          <p className="mt-3 text-slate-600">A full AI productivity suite, built for focus.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fade}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
              className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
            >
              <span className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${f.tone} text-white shadow-glow`}>
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-5xl px-5 pb-24">
        <div className="rounded-[28px] bg-gradient-to-br from-brand-600 to-indigo-600 p-8 text-white shadow-card sm:p-12">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">How the AI works</h2>
            <p className="mt-3 text-white/80">From a single task to a fully managed plan—automatically.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW.map((step, i) => (
              <motion.div
                key={step.label}
                variants={fade}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i}
                className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 font-bold">
                  {i + 1}
                </span>
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-white/80" />
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/dashboard">
              <Button size="lg" variant="dark">
                Start with the Dashboard <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <Logo compact />
          <p className="text-xs text-slate-400">
            Built for the hackathon · Deadline Guardian AI © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
