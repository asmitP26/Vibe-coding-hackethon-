/*
 * storageService - LocalStorage persistence for tasks & habits.
 * SECURITY_NOTE: only non-sensitive app state is stored. Every access is
 * wrapped in try/catch so private mode, quota errors, or corrupted data can
 * never crash the app. Getters ALWAYS return a valid array, falling back to the
 * bundled mock data whenever storage is missing, null, corrupted, or the wrong
 * shape - they never return null/undefined.
 */
import { tasks as mockTasks, habits as mockHabits } from '../data/mockData';

const KEYS = {
  TASKS: 'dg.tasks.v1',
  HABITS: 'dg.habits.v1',
  ASSISTANT: 'deadlineGuardian.assistantMessages',
};

// Cap the persisted conversation so localStorage never grows unbounded.
const MAX_ASSISTANT_MESSAGES = 50;

function available() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/**
 * Read + validate a stored array. Returns `fallback` (never null/undefined) when
 * the key is missing, the JSON is corrupted, or the parsed value is not an array.
 * Logs a single concise warning on corruption so issues are visible but not spammy.
 */
function readArray(key, fallback) {
  if (!available()) return fallback;
  let raw;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    console.warn(`[storageService] "${key}" is not an array - restoring defaults.`);
    return fallback;
  } catch {
    console.warn(`[storageService] "${key}" contains corrupted JSON - restoring defaults.`);
    return fallback;
  }
}

function write(key, value) {
  if (!available()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Always returns an array of tasks (stored value or mock fallback). Never null. */
export function getTasks() {
  return readArray(KEYS.TASKS, mockTasks);
}

export function saveTasks(tasks) {
  return write(KEYS.TASKS, Array.isArray(tasks) ? tasks : mockTasks);
}

/** Always returns an array of habits (stored value or mock fallback). Never null. */
export function getHabits() {
  return readArray(KEYS.HABITS, mockHabits);
}

export function saveHabits(habits) {
  return write(KEYS.HABITS, Array.isArray(habits) ? habits : mockHabits);
}

/**
 * Assistant conversation persistence so the Copilot chat survives navigation and
 * refresh (shared by the full Assistant page and the floating panel). Returns
 * the provided `fallback` when nothing is stored or the data is corrupted.
 */
export function getAssistantMessages(fallback = []) {
  return readArray(KEYS.ASSISTANT, fallback);
}

/** Persist the conversation, keeping only the most recent messages. */
export function saveAssistantMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return write(KEYS.ASSISTANT, list.slice(-MAX_ASSISTANT_MESSAGES));
}

export function clearAll() {
  if (!available()) return;
  try {
    window.localStorage.removeItem(KEYS.TASKS);
    window.localStorage.removeItem(KEYS.HABITS);
    window.localStorage.removeItem(KEYS.ASSISTANT);
  } catch {
    /* ignore */
  }
}

/**
 * Reset persisted state back to the bundled mock data. Useful as a recovery
 * action; returns the restored values so callers can re-seed React state.
 */
export function resetToMockData() {
  write(KEYS.TASKS, mockTasks);
  write(KEYS.HABITS, mockHabits);
  return { tasks: mockTasks, habits: mockHabits };
}
