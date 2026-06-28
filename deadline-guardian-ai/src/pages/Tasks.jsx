import { useMemo, useState } from 'react';
import { Plus, ClipboardList, CheckCircle2, ShieldCheck, CalendarCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import TaskCard from '../components/tasks/TaskCard';
import AddTaskModal from '../components/tasks/AddTaskModal';
import { useApp } from '../context/AppContext';
import { sortTasksByPriority, resolveRisk } from '../services/taskEngine';
import { daysUntil } from '../utils/dateUtils';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { cn } from '../lib/cn';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'critical', label: 'Critical' },
  { key: 'completed', label: 'Completed' },
];

const EMPTY_COPY = {
  all: { icon: ClipboardList, title: 'No tasks yet', description: 'Add your first task and let the AI prioritize it for you.' },
  today: { icon: CalendarCheck, title: 'Nothing due today', description: "You're all clear for today. Enjoy the breathing room." },
  critical: { icon: ShieldCheck, title: 'No tasks at risk', description: 'Nothing critical right now — you are nicely on track.' },
  completed: { icon: CheckCircle2, title: 'No completed tasks yet', description: 'Finish a task and it will show up here.' },
};

export default function Tasks() {
  const { tasks, toggleTask, toggleSubtask } = useApp();
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  const visible = useMemo(() => {
    const ranked = sortTasksByPriority(tasks);
    switch (filter) {
      case 'today':
        return ranked.filter((t) => t.deadline && daysUntil(t.deadline) <= 0 && t.status !== 'completed');
      case 'critical':
        return ranked.filter((t) => ['critical', 'high'].includes(resolveRisk(t)) && t.status !== 'completed');
      case 'completed':
        return ranked.filter((t) => t.status === 'completed');
      default:
        return ranked;
    }
  }, [tasks, filter]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      today: tasks.filter((t) => t.deadline && daysUntil(t.deadline) <= 0 && t.status !== 'completed').length,
      critical: tasks.filter((t) => ['critical', 'high'].includes(resolveRisk(t)) && t.status !== 'completed').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    }),
    [tasks],
  );

  return (
    <div>
      <PageHeader title="Tasks" subtitle="AI-prioritized, risk-aware, and ready to tackle.">
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'chip',
              filter === f.key && 'border-brand-300 bg-brand-50 text-brand-700',
            )}
          >
            {f.label}
            <span className="ml-0.5 rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-500">
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={EMPTY_COPY[filter].icon}
          title={EMPTY_COPY[filter].title}
          description={EMPTY_COPY[filter].description}
          action={
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Add a task
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          layout
          className="grid grid-cols-1 gap-4 xl:grid-cols-2"
        >
          {visible.map((task) => (
            <motion.div key={task.id} variants={fadeInUp} layout>
              <TaskCard
                task={task}
                onToggle={toggleTask}
                onToggleSubtask={toggleSubtask}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <AddTaskModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
