import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useApp } from '../../context/AppContext';
import { analyzeTask, getAIMode } from '../../services/geminiService';

/**
 * Quick Add Task - inline composer that runs the new task through
 * geminiService.analyzeTask() (live Gemini or offline mock) so even a one-line
 * quick-add gets prioritized, risk-scored, and broken down automatically.
 */
export default function QuickAddTask() {
  const { addTaskWithAnalysis, showToast } = useApp();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const value = title.trim();
    if (!value || busy) return;

    const draft = {
      title: value,
      description: '',
      category: 'Inbox',
      importance: 3,
      estimatedEffort: 1,
      deadline: null,
      status: 'todo',
    };

    setBusy(true);
    try {
      const analysis = await analyzeTask(draft);
      addTaskWithAnalysis(draft, analysis);
      setTitle('');
      const live = getAIMode() === 'live';
      showToast(live ? 'Task analyzed with Gemini ✓' : 'Task added with Mock AI', live ? 'success' : 'info');
    } catch (err) {
      // analyzeTask falls back internally; this only guards unexpected throws.
      console.warn('[QuickAddTask] AI analysis failed - using local fallback.', err);
      addTaskWithAnalysis(draft, {});
      setTitle('');
      showToast('Gemini was unavailable - added with local analysis instead.', 'warning');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="mb-3 text-sm font-semibold text-slate-900">Quick add task</p>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to get done?"
          maxLength={140}
          disabled={busy}
          className="input"
          aria-label="New task title"
        />
        <Button type="submit" className="sm:w-auto" disabled={!title.trim() || busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add
            </>
          )}
        </Button>
      </form>
      <p className="mt-2 text-xs text-slate-400">
        AI will analyze priority, risk, and effort automatically.
      </p>
    </Card>
  );
}
