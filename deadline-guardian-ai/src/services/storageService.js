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
  PREFERENCES: 'dg.preferences.v1',
  ALERTS: 'dg.alerts.v1',
};

// Legacy key for the assistant chat that older builds persisted. The Copilot
// conversation is now session-only (React state), so this key is only ever
// removed, never written.
const LEGACY_ASSISTANT_KEY = 'deadlineGuardian.assistantMessages';

/**
 * User-editable profile + preferences, surfaced in the Topbar profile menu and
 * persisted across refreshes. Only non-sensitive UI settings live here.
 */
export const DEFAULT_PREFERENCES = {
  displayName: 'Asmit',
  role: 'Student / Builder',
  productivityStyle: 'Balanced',
  usage: 'Mixed',
  workStart: '09:00',
  workEnd: '21:00',
  focusDuration: 50,
  remindersEnabled: true,
  reminderSound: true,
  voiceAutoSend: false,
  onboarded: false,
};

// Read/dismiss bookkeeping for the notifications panel (alert ids are stable).
const DEFAULT_ALERT_STATE = { read: [], dismissed: [] };

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

/**
 * Read + validate a stored plain object. Returns `fallback` when the key is
 * missing, the JSON is corrupted, or the parsed value is not a plain object.
 */
function readObject(key, fallback) {
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
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    console.warn(`[storageService] "${key}" is not an object - restoring defaults.`);
    return fallback;
  } catch {
    console.warn(`[storageService] "${key}" contains corrupted JSON - restoring defaults.`);
    return fallback;
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
 * One-time cleanup of the assistant chat that older builds persisted. The
 * Copilot conversation is now session-only (kept in React state and reset on
 * refresh), so any previously stored messages are removed and never read again.
 */
export function clearLegacyAssistantStorage() {
  if (!available()) return;
  try {
    window.localStorage.removeItem(LEGACY_ASSISTANT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Profile + preferences. Always merged onto DEFAULT_PREFERENCES so a partial or
 * older stored object can never leave a field undefined.
 */
export function getPreferences() {
  return { ...DEFAULT_PREFERENCES, ...readObject(KEYS.PREFERENCES, {}) };
}

export function savePreferences(prefs) {
  const merged = { ...DEFAULT_PREFERENCES, ...(prefs && typeof prefs === 'object' ? prefs : {}) };
  return write(KEYS.PREFERENCES, merged);
}

/**
 * Read/dismiss bookkeeping for the notifications panel. Returns an object with
 * `read` and `dismissed` string-id arrays (never null/undefined).
 */
export function getAlertState() {
  const stored = readObject(KEYS.ALERTS, DEFAULT_ALERT_STATE);
  return {
    read: Array.isArray(stored.read) ? stored.read : [],
    dismissed: Array.isArray(stored.dismissed) ? stored.dismissed : [],
  };
}

export function saveAlertState(state) {
  return write(KEYS.ALERTS, {
    read: Array.isArray(state?.read) ? state.read : [],
    dismissed: Array.isArray(state?.dismissed) ? state.dismissed : [],
  });
}

export function clearAll() {
  if (!available()) return;
  try {
    window.localStorage.removeItem(KEYS.TASKS);
    window.localStorage.removeItem(KEYS.HABITS);
    window.localStorage.removeItem(LEGACY_ASSISTANT_KEY);
    window.localStorage.removeItem(KEYS.PREFERENCES);
    window.localStorage.removeItem(KEYS.ALERTS);
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
