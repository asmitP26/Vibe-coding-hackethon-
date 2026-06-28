import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  user as mockUser,
  scheduleBlocks,
  recommendations,
  dailyGoals,
  productivityStats,
  dailyBrief,
  assistantMessages,
  quickPrompts,
} from '../data/mockData';
import {
  getTasks,
  saveTasks,
  getHabits,
  saveHabits,
  getAssistantMessages,
  saveAssistantMessages,
  getPreferences,
  savePreferences,
  resetToMockData,
  saveAlertState,
} from '../services/storageService';
import { markReminderTriggered as applyReminderTriggered } from '../services/alarmService';

const AppContext = createContext(null);

/** Safe fallback for productivity stats so widgets never read undefined fields. */
const DEFAULT_STATS = {
  completionRate: 0,
  tasksCompleted: 0,
  missedDeadlines: 0,
  highRiskTasks: 0,
  productivityScore: 0,
  focusHours: 0,
  trend: [],
  byCategory: [],
};

/** Coerce any value to an array (used to guarantee safe context values). */
const asArray = (value) => (Array.isArray(value) ? value : []);
/** Coerce any value to a plain object, else use the provided fallback. */
const asObject = (value, fallback) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;

/** The Copilot's opening line, shown after the conversation is cleared. */
const ASSISTANT_GREETING = {
  id: 'copilot-greeting',
  role: 'assistant',
  content:
    "Hi! I'm your Productivity Copilot. Ask me to plan your day, surface deadline risks, or break down your biggest task - I'll use your real tasks, habits, and schedule.",
};

export function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Normalize a subtask definition into the canonical checklist shape used across
 * the app: { id, title, estimatedMinutes, order, status, done }. Accepts either
 * a plain string title or an AI object like { title, estimatedEffort } (hours).
 * `done` is kept in sync with `status` for backward compatibility with the
 * legacy mock data and anything already persisted to localStorage.
 */
export function buildSubtask(input, index = 0) {
  const title = (typeof input === 'string' ? input : input?.title || '').trim();
  const hours = typeof input === 'object' ? Number(input?.estimatedEffort) : NaN;
  const minutes = Number.isFinite(input?.estimatedMinutes)
    ? Math.round(input.estimatedMinutes)
    : Number.isFinite(hours)
      ? Math.round(hours * 60)
      : 30;
  return {
    id: createId('s'),
    title,
    estimatedMinutes: minutes > 0 ? minutes : 30,
    order: index + 1,
    status: 'pending',
    done: false,
  };
}

export function AppProvider({ children }) {
  // Hydrate from storage; storageService already guarantees an array, but we
  // double-check here so state is ALWAYS an array (never null/undefined/object).
  const [tasks, setTasks] = useState(() => asArray(getTasks()));
  const [habits, setHabits] = useState(() => asArray(getHabits()));

  // Bumped whenever demo data is reset, so independent consumers (e.g. the
  // notification bell, which keeps its own alert state) can re-sync.
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  // Shared, persisted Copilot conversation. Lives here (not inside useCopilot)
  // so the full Assistant page and the floating panel render the SAME messages,
  // and the chat survives navigation + refresh. Seeded from storage, falling
  // back to the demo history on first ever load.
  const [assistantConversation, setAssistantConversation] = useState(() => {
    const stored = getAssistantMessages(null);
    return Array.isArray(stored) && stored.length ? stored : asArray(assistantMessages);
  });

  useEffect(() => {
    saveAssistantMessages(assistantConversation);
  }, [assistantConversation]);

  /** Append one or more messages to the shared conversation (capped at 50). */
  const appendAssistantMessages = useCallback((incoming) => {
    const additions = (Array.isArray(incoming) ? incoming : [incoming]).filter(
      (m) => m && typeof m === 'object',
    );
    if (!additions.length) return;
    setAssistantConversation((prev) => [...prev, ...additions].slice(-50));
  }, []);

  /** Reset the conversation back to a single fresh greeting. */
  const clearAssistantConversation = useCallback(() => {
    setAssistantConversation([{ ...ASSISTANT_GREETING }]);
  }, []);

  // User-editable profile + preferences (display name, work hours, focus length,
  // reminder sound, voice auto-send). Persisted so they survive a refresh and
  // shared app-wide (Topbar profile menu writes; VoiceContext reads autoSend).
  const [preferences, setPreferences] = useState(() => getPreferences());

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  /** Merge a partial patch into preferences (and persist via the effect above). */
  const updatePreferences = useCallback((patch) => {
    setPreferences((prev) => ({ ...prev, ...(patch && typeof patch === 'object' ? patch : {}) }));
  }, []);

  const addTask = useCallback((partial) => {
    const newTask = {
      id: createId('t'),
      title: 'Untitled task',
      description: '',
      category: 'Inbox',
      deadline: null,
      estimatedEffort: 1,
      importance: 3,
      status: 'todo',
      tags: [],
      subtasks: [],
      // Task reminder/alarm fields (see alarmService + useReminderEngine).
      reminderAt: null,
      reminderEnabled: false,
      reminderTriggered: false,
      reminderSnoozed: false,
      createdAt: new Date().toISOString(),
      ...partial,
    };
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, []);

  /**
   * Create a task and enrich it with the result of geminiService.analyzeTask().
   * The AI analysis is mapped onto the fields the UI reads; anything missing
   * falls back to the draft or is computed lazily by the task engine in the UI.
   */
  const addTaskWithAnalysis = useCallback((draft = {}, analysis = {}) => {
    const subtasks = Array.isArray(analysis.suggestedSubtasks)
      ? analysis.suggestedSubtasks
          .filter((t) => typeof t === 'string' && t.trim())
          .map((title, i) => buildSubtask(title, i))
      : [];
    return addTask({
      ...draft,
      priorityScore: analysis.priorityScore ?? draft.priorityScore,
      riskLevel: analysis.riskLevel ?? draft.riskLevel,
      aiReason: analysis.reason ?? draft.aiReason ?? '',
      nextBestAction: analysis.nextBestAction ?? null,
      reminderMessage: analysis.reminderMessage ?? null,
      recommendedStart: analysis.recommendedStart ?? null,
      category: analysis.category || draft.category || 'Inbox',
      estimatedEffort: draft.estimatedEffort ?? analysis.estimatedEffort ?? 1,
      subtasks,
    });
  }, [addTask]);

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const toggleTask = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' }
          : t,
      ),
    );
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // --- Task reminders / alarms ------------------------------------------------
  /**
   * Set (or clear) a task's reminder. Passing reminderEnabled=false or a null
   * time disarms it. Any change re-arms the alarm (reminderTriggered=false) so a
   * rescheduled reminder can fire again.
   */
  const setTaskReminder = useCallback((taskId, { reminderAt = null, reminderEnabled = false } = {}) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              reminderAt: reminderEnabled && reminderAt ? reminderAt : null,
              reminderEnabled: !!(reminderEnabled && reminderAt),
              reminderTriggered: false,
              reminderSnoozed: false,
            }
          : t,
      ),
    );
  }, []);

  /** Push a task's reminder out by `minutes` and re-arm it (used by snooze). */
  const snoozeReminder = useCallback((taskId, minutes = 10) => {
    const next = new Date(Date.now() + minutes * 60000).toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, reminderAt: next, reminderEnabled: true, reminderTriggered: false, reminderSnoozed: true }
          : t,
      ),
    );
  }, []);

  /** Mark a task's reminder as fired so the engine never re-fires it. */
  const markReminderTriggered = useCallback((taskId) => {
    setTasks((prev) => applyReminderTriggered(prev, taskId));
  }, []);

  const toggleSubtask = useCallback((taskId, subtaskId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = (t.subtasks || []).map((s) => {
          if (s.id !== subtaskId) return s;
          const nowDone = !(s.status === 'completed' || s.done === true);
          return { ...s, status: nowDone ? 'completed' : 'pending', done: nowDone };
        });
        // Keep the parent task's status in sync with its checklist.
        const total = subtasks.length;
        const completed = subtasks.filter((s) => s.status === 'completed' || s.done === true).length;
        let status = t.status;
        if (total > 0 && completed === total) status = 'completed';
        else if (t.status === 'completed' && completed < total) status = 'in-progress';
        return { ...t, subtasks, status };
      }),
    );
  }, []);

  const addSubtasks = useCallback((taskId, titles = []) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const base = (t.subtasks || []).length;
        const created = titles.map((title, i) => buildSubtask(title, base + i));
        return { ...t, subtasks: [...(t.subtasks || []), ...created] };
      }),
    );
  }, []);

  /**
   * Replace a task's checklist with the result of geminiService.breakDownTask().
   * Accepts the AI subtask array (objects with { title, estimatedEffort } or
   * plain strings) and normalizes it. Re-opens a completed task for work.
   */
  const applyBreakdown = useCallback((taskId, subtasks = []) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const mapped = (subtasks || [])
          .filter((s) => (typeof s === 'string' ? s.trim() : s?.title?.trim()))
          .map((s, i) => buildSubtask(s, i));
        if (!mapped.length) return t;
        return {
          ...t,
          subtasks: mapped,
          status: t.status === 'completed' ? 'in-progress' : t.status,
        };
      }),
    );
  }, []);

  const toggleHabit = useCallback((id) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const completedToday = !h.completedToday;
        return {
          ...h,
          completedToday,
          streak: completedToday ? h.streak + 1 : Math.max(0, h.streak - 1),
        };
      }),
    );
  }, []);

  // --- Lightweight, non-blocking toast notifications --------------------------
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const showToast = useCallback((message, tone = 'info', options = {}) => {
    if (!message) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const { actions = null, duration } = options && typeof options === 'object' ? options : {};
    const safeActions = Array.isArray(actions)
      ? actions.filter((a) => a && typeof a.onClick === 'function' && a.label)
      : null;
    setToast({ id: Date.now(), message, tone, actions: safeActions });
    // Toasts with actions linger a little longer so they can be clicked.
    const ttl = Number.isFinite(duration) ? duration : safeActions?.length ? 9000 : 4000;
    toastTimer.current = setTimeout(() => setToast(null), ttl);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // Restore the original sample tasks, habits, reminders and a fresh assistant
  // greeting - handy for live demos so judges can reset to a known-good state.
  const resetDemoData = useCallback(() => {
    const fresh = resetToMockData();
    setTasks(asArray(fresh?.tasks));
    setHabits(asArray(fresh?.habits));
    saveAlertState({ read: [], dismissed: [] });
    clearAssistantConversation();
    setDataVersion((v) => v + 1);
    showToast('Demo data restored - sample tasks, habits and reminders are back.', 'success');
  }, [clearAssistantConversation, showToast]);

  const value = useMemo(
    () => ({
      // live state (always arrays)
      tasks: asArray(tasks),
      habits: asArray(habits),
      // static demo data (guarded so a bad import can never blank the UI)
      user: asObject(mockUser, {}),
      scheduleBlocks: asArray(scheduleBlocks),
      recommendations: asArray(recommendations),
      dailyGoals: asArray(dailyGoals),
      productivityStats: asObject(productivityStats, DEFAULT_STATS),
      dailyBrief: asObject(dailyBrief, { summary: '', highlights: [] }),
      assistantMessages: asArray(assistantMessages),
      quickPrompts: asArray(quickPrompts),
      // shared, persisted Copilot conversation + actions
      assistantConversation: asArray(assistantConversation),
      appendAssistantMessages,
      clearAssistantConversation,
      // user-editable, persisted preferences
      preferences: asObject(preferences, {}),
      updatePreferences,
      // actions
      addTask,
      addTaskWithAnalysis,
      updateTask,
      toggleTask,
      deleteTask,
      setTaskReminder,
      snoozeReminder,
      markReminderTriggered,
      toggleSubtask,
      addSubtasks,
      applyBreakdown,
      toggleHabit,
      // ui: toasts
      toast,
      showToast,
      dismissToast,
      // demo helpers
      dataVersion,
      resetDemoData,
    }),
    [tasks, habits, addTask, addTaskWithAnalysis, updateTask, toggleTask, deleteTask, setTaskReminder, snoozeReminder, markReminderTriggered, toggleSubtask, addSubtasks, applyBreakdown, toggleHabit, toast, showToast, dismissToast, assistantConversation, appendAssistantMessages, clearAssistantConversation, preferences, updatePreferences, dataVersion, resetDemoData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}

export default AppContext;
