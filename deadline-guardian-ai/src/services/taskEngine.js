/*
 * taskEngine - local, deterministic prioritization rules.
 * These run instantly offline and act as the fallback the AI layer builds on.
 */
import { hoursUntil, isOverdue } from '../utils/dateUtils';

const DEFAULT_IMPORTANCE = 3;

function clamp(n, min, max) {
  const value = Number(n);
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Score a task from 0-100 using importance, deadline urgency, and effort.
 * Higher means "do this sooner".
 */
export function calculatePriorityScore(task) {
  if (!task || task.status === 'completed') return 0;

  const importance = clamp(task.importance ?? DEFAULT_IMPORTANCE, 1, 5);
  const importanceScore = (importance / 5) * 45;

  let urgencyScore;
  if (!task.deadline) {
    urgencyScore = 10;
  } else if (isOverdue(task.deadline)) {
    urgencyScore = 40;
  } else {
    const hrs = hoursUntil(task.deadline);
    if (hrs <= 12) urgencyScore = 38;
    else if (hrs <= 24) urgencyScore = 34;
    else if (hrs <= 48) urgencyScore = 28;
    else if (hrs <= 72) urgencyScore = 22;
    else if (hrs <= 24 * 7) urgencyScore = 14;
    else urgencyScore = 7;
  }

  const effort = clamp(task.estimatedEffort ?? 1, 0, 24);
  const effortScore = Math.min(15, (effort / 8) * 15);

  return Math.round(Math.min(100, importanceScore + urgencyScore + effortScore));
}

/** Classify deadline risk into: critical | high | attention | safe. */
export function getRiskLevel(task) {
  if (!task || task.status === 'completed') return 'safe';
  if (!task.deadline) return 'safe';

  const importance = clamp(task.importance ?? DEFAULT_IMPORTANCE, 1, 5);

  if (isOverdue(task.deadline)) return importance >= 4 ? 'critical' : 'attention';

  const hrs = hoursUntil(task.deadline);
  if (hrs <= 24) return importance >= 4 ? 'critical' : 'high';
  if (hrs <= 60) return importance >= 4 ? 'high' : 'attention';
  if (hrs <= 24 * 5) return importance >= 4 ? 'attention' : 'safe';
  return 'safe';
}

/** Prefer an explicit value on the task, otherwise compute it. */
export function resolveScore(task) {
  return task?.priorityScore ?? calculatePriorityScore(task);
}

export function resolveRisk(task) {
  return task?.riskLevel ?? getRiskLevel(task);
}

/** Sort a copy of the tasks by descending priority score. */
export function sortTasksByPriority(tasks = []) {
  const list = Array.isArray(tasks) ? tasks : [];
  return [...list].sort((a, b) => resolveScore(b) - resolveScore(a));
}

/** True when a checklist subtask is complete (supports new `status` and legacy `done`). */
export function subtaskDone(subtask) {
  return subtask?.status === 'completed' || subtask?.done === true;
}

/** Completion percentage (0-100) of a task's subtask checklist. */
export function taskProgress(task) {
  const subtasks = task?.subtasks || [];
  if (!subtasks.length) return 0;
  const done = subtasks.filter(subtaskDone).length;
  return Math.round((done / subtasks.length) * 100);
}
