/*
 * globalSearch - powers the Topbar search box.
 *
 * Pure, dependency-free, and never throws: given the app's live data and a raw
 * query string it returns grouped, ranked matches across Tasks, Habits, Planner
 * (schedule blocks) and Assistant messages. Matching is intentionally forgiving
 * (exact > prefix > substring > all-tokens > fuzzy subsequence) so partial and
 * slightly-misspelled queries still surface useful results.
 */
import { formatDeadline } from '../utils/dateUtils';

// Max results shown per group so the dropdown stays compact.
const PER_GROUP = 5;

/** Two-pointer subsequence test: are all chars of `needle` in `haystack` in order? */
function isSubsequence(needle, haystack) {
  if (!needle) return false;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
    if (haystack[j] === needle[i]) i += 1;
  }
  return i === needle.length;
}

/**
 * Score how well `text` matches `query`. Higher is better; 0 means no match.
 * The tiers keep the most relevant items (exact/prefix) above looser matches.
 */
export function scoreMatch(text, query) {
  const h = String(text || '').toLowerCase().trim();
  const q = String(query || '').toLowerCase().trim();
  if (!q || !h) return 0;
  if (h === q) return 100;
  const idx = h.indexOf(q);
  if (idx === 0) return 85; // prefix
  if (idx > 0) return 65; // substring
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => h.includes(t))) return 45; // all words present
  if (isSubsequence(q.replace(/\s+/g, ''), h)) return 25; // loose fuzzy
  return 0;
}

/** Best score across several candidate fields (title weighted highest). */
function bestScore(query, fields) {
  let best = 0;
  for (let i = 0; i < fields.length; i += 1) {
    const weight = i === 0 ? 1 : 0.7; // non-title fields count a little less
    const s = scoreMatch(fields[i], query) * weight;
    if (s > best) best = s;
  }
  return best;
}

const TYPE_LABELS = {
  habit: 'Daily',
  focus: 'Focus block',
  work: 'Work block',
  break: 'Break',
};

function rank(items) {
  return items
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, PER_GROUP);
}

/**
 * Run the search. Returns:
 *   { query, total, groups: [{ key, label, items: [...] }], flat: [...] }
 * Each item: { id, group, title, subtitle, to, score }.
 * `flat` is ranked across all groups so the caller can open the top hit on Enter.
 */
export function searchEverything(data, rawQuery) {
  const query = String(rawQuery || '').trim();
  const empty = { query, total: 0, groups: [], flat: [] };
  if (query.length < 1) return empty;

  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const habits = Array.isArray(data?.habits) ? data.habits : [];
  const scheduleBlocks = Array.isArray(data?.scheduleBlocks) ? data.scheduleBlocks : [];
  const assistant = Array.isArray(data?.assistantMessages) ? data.assistantMessages : [];

  const taskItems = rank(
    tasks.map((t) => ({
      id: t.id,
      group: 'tasks',
      title: t.title || 'Untitled task',
      subtitle: [t.category, t.deadline ? formatDeadline(t.deadline) : 'No deadline']
        .filter(Boolean)
        .join(' · '),
      to: '/tasks',
      score: bestScore(query, [t.title, t.category, t.description, (t.tags || []).join(' ')]),
    })),
  );

  const habitItems = rank(
    habits.map((h) => ({
      id: h.id,
      group: 'habits',
      title: h.name || 'Habit',
      subtitle: `${h.streak || 0}-day streak${h.completedToday ? ' · done today' : ''}`,
      to: '/habits',
      score: bestScore(query, [h.name]),
    })),
  );

  const plannerItems = rank(
    scheduleBlocks.map((b) => ({
      id: b.id,
      group: 'planner',
      title: b.title || 'Schedule block',
      subtitle: [`${b.start}–${b.end}`, TYPE_LABELS[b.type] || b.type].filter(Boolean).join(' · '),
      to: '/planner',
      score: bestScore(query, [b.title, b.type]),
    })),
  );

  const assistantItems = rank(
    assistant
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .map((m) => {
        const text = m.content.trim();
        return {
          id: m.id,
          group: 'assistant',
          title: text.length > 70 ? `${text.slice(0, 70)}…` : text,
          subtitle: m.role === 'user' ? 'You asked' : 'Copilot reply',
          to: '/assistant',
          score: bestScore(query, [text]),
        };
      }),
  );

  const groups = [
    { key: 'tasks', label: 'Tasks', items: taskItems },
    { key: 'habits', label: 'Habits', items: habitItems },
    { key: 'planner', label: 'Planner', items: plannerItems },
    { key: 'assistant', label: 'Assistant', items: assistantItems },
  ].filter((g) => g.items.length > 0);

  const flat = groups
    .flatMap((g) => g.items)
    .sort((a, b) => b.score - a.score);

  return { query, total: flat.length, groups, flat };
}
