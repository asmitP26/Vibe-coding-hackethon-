/*
 * voiceCommands - a lightweight, dependency-free "NLP" layer that turns a
 * spoken transcript into an app action.
 *
 *   parseVoiceCommand(text)  ->  { type, intent, action, text, title, raw, confidence }
 *   executeVoiceCommand(parsed, deps)  ->  Promise<{ ok, message, tone }>
 *
 * The parser uses simple keyword/regex matching (add / complete / break /
 * reschedule / show / plan / what-now) and extracts a task title when present.
 * It classifies each transcript as a "command" (a concrete app action) or
 * "text" (natural language for the Copilot). Text is routed into the Assistant
 * input by the caller instead of raising a "didn't catch a command" error.
 *
 * The executor routes each intent to the right place:
 *   - add task        -> geminiService.analyzeTask + addTaskWithAnalysis
 *   - complete task   -> fuzzy match a task by name, then toggleTask
 *   - show priority   -> navigate to the Tasks list (already priority-sorted)
 *   - plan / now /     -> navigate to the Assistant with the spoken text as a
 *     break / reschedule   ?q= query, which the Productivity Copilot routes
 *                          through generateDailyPlan / getProductivityCoaching /
 *                          breakDownTask / rescheduleTasks and renders as cards.
 *
 * Mutating handlers (addTaskWithAnalysis, toggleTask), the current tasks list,
 * and navigate come from React via `deps` so this module stays UI-agnostic.
 */
import { analyzeTask } from './geminiService';

export const VOICE_INTENTS = {
  ADD_TASK: 'add_task',
  COMPLETE_TASK: 'complete_task',
  BREAK_DOWN: 'break_down',
  RESCHEDULE: 'reschedule',
  SHOW_HIGH_PRIORITY: 'show_high_priority',
  PLAN_DAY: 'plan_day',
  WHAT_NOW: 'what_now',
  UNKNOWN: 'unknown',
};

/** Collapse whitespace and trim. */
const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ');

/** Strip a leading article and a redundant trailing "task" word from a name. */
const cleanTaskName = (s) =>
  clean(s)
    .replace(/\s*\btasks?\b\s*$/i, '')
    .replace(/^(?:the|my|a|an)\s+/i, '')
    .trim();

/**
 * Map a raw transcript to an intent (+ optional task title).
 * Order matters: the most specific patterns are tested first.
 */
function detectVoiceIntent(input = '') {
  const raw = clean(input).replace(/[.!?]+$/, '');
  if (!raw) return { intent: VOICE_INTENTS.UNKNOWN, title: '', raw: '' };
  const t = raw.toLowerCase();

  // 1) Mark task X complete | complete/finish the task X
  let m =
    raw.match(/\bmark\s+(?:the\s+)?(?:task\s+)?(.+?)\s+(?:as\s+)?(?:complete|completed|done|finished)\b/i) ||
    raw.match(/\b(?:complete|finish|close)\s+(?:the\s+)?task\s+(.+)/i);
  if (m && cleanTaskName(m[1])) {
    return { intent: VOICE_INTENTS.COMPLETE_TASK, title: cleanTaskName(m[1]), raw };
  }

  // 2) Add / create / new task [title]
  m = raw.match(/\b(?:add|create|new)\s+(?:a\s+|an\s+)?task\b[:\-\s]*(.*)/i);
  if (m) return { intent: VOICE_INTENTS.ADD_TASK, title: clean(m[1]), raw };

  // 3) Break down [my/the/this] task [name]
  if (/\bbreak\s*(?:it|my|the|this)?\s*down\b|\bbreak down\b|\bbreak up\b|\bsub-?tasks?\b/i.test(t)) {
    const bm = raw.match(/break\s*(?:down|up)\s+(?:my\s+|the\s+|this\s+)?task\s+(.+)/i);
    return { intent: VOICE_INTENTS.BREAK_DOWN, title: clean(bm?.[1] || ''), raw };
  }

  // 4) Reschedule / catch up / behind / missed tasks
  if (/\bresched\w*|\bre-?schedule\b|\bcatch up\b|\bfell behind\b|\bbehind schedule\b|\bmissed task/i.test(t)) {
    return { intent: VOICE_INTENTS.RESCHEDULE, title: '', raw };
  }

  // 5) Show my high-priority tasks
  if (
    /\b(show|list|view|see|what are)\b.*\b(high[-\s]?priorit\w*|top\s+priorit\w*|priorit\w*|important|critical|urgent)\b/i.test(t) ||
    /\bhigh[-\s]?priority\b/i.test(t)
  ) {
    return { intent: VOICE_INTENTS.SHOW_HIGH_PRIORITY, title: '', raw };
  }

  // 6) Plan my day
  if (
    /\bplan\b.*\b(day|today|morning|afternoon|evening|schedule|hours?)\b/i.test(t) ||
    /\bplan my day\b/i.test(t) ||
    /\borgani[sz]e\b.*\bday\b/i.test(t)
  ) {
    return { intent: VOICE_INTENTS.PLAN_DAY, title: '', raw };
  }

  // 7) What should I do now / next
  if (
    /\bwhat\b.*\b(do|now|next|focus|start|work on|tackle)\b/i.test(t) ||
    /\bwhat should i\b/i.test(t) ||
    /\bwhere.*start\b/i.test(t) ||
    /\bwhat'?s next\b/i.test(t)
  ) {
    return { intent: VOICE_INTENTS.WHAT_NOW, title: '', raw };
  }

  // 8) Loose fallback: "add/remember/note <something>" without the word "task".
  m = raw.match(/^(?:add|create|remember to|note)\s+(.+)/i);
  if (m && clean(m[1])) return { intent: VOICE_INTENTS.ADD_TASK, title: clean(m[1]), raw };

  return { intent: VOICE_INTENTS.UNKNOWN, title: '', raw };
}
// Intents that perform a concrete app action (mutate tasks / navigate the app)
// run immediately. Everything else is treated as natural language for the
// Copilot: the transcript is dropped into the Assistant input instead of
// throwing a "didn't catch a command" error.
const COMMAND_INTENTS = new Set([
  VOICE_INTENTS.ADD_TASK,
  VOICE_INTENTS.COMPLETE_TASK,
  VOICE_INTENTS.SHOW_HIGH_PRIORITY,
]);

/**
 * Classify a spoken transcript.
 *
 * @returns {{ type:'command'|'text', intent:string, action:string, text:string,
 *             title:string, raw:string, confidence:number }}
 *   - type "command": a concrete action (add / complete a task, show priorities)
 *     handled by executeVoiceCommand.
 *   - type "text": natural language for the Copilot. The caller should place
 *     `text` into the Assistant input (and optionally send it) - never an error.
 */
export function parseVoiceCommand(input = '') {
  const base = detectVoiceIntent(input);
  const isCommand = COMMAND_INTENTS.has(base.intent);
  const confidence = base.intent === VOICE_INTENTS.UNKNOWN ? 0.4 : isCommand ? 0.9 : 0.6;
  return {
    ...base,
    type: isCommand ? 'command' : 'text',
    action: isCommand ? base.intent : 'assistant',
    text: base.raw,
    confidence,
  };
}
/** Build the Assistant deep-link that auto-sends a spoken question. */
const assistantRoute = (raw) => `/assistant?q=${encodeURIComponent(raw)}`;

/**
 * Fuzzy-match a task by spoken name. Prefers active (non-completed) tasks and
 * tries exact -> starts-with -> includes -> reverse-includes (the user may say
 * extra words around the title).
 */
function findTaskByTitle(tasks = [], query = '') {
  const needle = clean(query).toLowerCase();
  if (!needle) return null;
  const activeTasks = tasks.filter((t) => t.status !== 'completed');
  const pools = activeTasks.length ? [activeTasks, tasks] : [tasks];
  for (const pool of pools) {
    const titleOf = (t) => clean(t.title).toLowerCase();
    const exact = pool.find((t) => titleOf(t) === needle);
    if (exact) return exact;
    const starts = pool.find((t) => titleOf(t).startsWith(needle));
    if (starts) return starts;
    const includes = pool.find((t) => titleOf(t).includes(needle));
    if (includes) return includes;
    const reverse = pool.find((t) => titleOf(t) && needle.includes(titleOf(t)));
    if (reverse) return reverse;
  }
  return null;
}

const ok = (message, tone = 'success') => ({ ok: true, message, tone });
const info = (message) => ({ ok: true, message, tone: 'info' });
const warn = (message) => ({ ok: false, message, tone: 'warning' });

/**
 * Execute a parsed command. Always resolves (never rejects) with a result the
 * UI can show as a toast. `deps`: { tasks, addTaskWithAnalysis, toggleTask,
 * navigate }.
 */
export async function executeVoiceCommand(parsed, deps = {}) {
  const { tasks = [], addTaskWithAnalysis, toggleTask, navigate } = deps;
  const go = (path) => {
    try {
      navigate?.(path);
    } catch {
      /* navigation is best-effort */
    }
  };

  switch (parsed?.intent) {
    case VOICE_INTENTS.ADD_TASK: {
      const title = clean(parsed.title);
      if (!title) return warn('What should I add? Try "add task finish the report".');
      const draft = {
        title,
        description: '',
        category: 'Inbox',
        importance: 3,
        estimatedEffort: 1,
        deadline: null,
        status: 'todo',
      };
      // analyzeTask never throws (it falls back to a local mock), but guard anyway.
      let analysis = {};
      try {
        analysis = await analyzeTask(draft);
      } catch {
        analysis = {};
      }
      addTaskWithAnalysis?.(draft, analysis || {});
      go('/tasks');
      return ok(`Added & analyzed: "${title}".`);
    }

    case VOICE_INTENTS.COMPLETE_TASK: {
      const match = findTaskByTitle(tasks, parsed.title);
      if (!match) return warn(`I couldn't find a task called "${clean(parsed.title)}".`);
      const wasOpen = match.status !== 'completed';
      toggleTask?.(match.id);
      return wasOpen ? ok(`Marked "${match.title}" complete.`) : info(`Reopened "${match.title}".`);
    }

    case VOICE_INTENTS.SHOW_HIGH_PRIORITY:
      go('/tasks');
      return info('Here are your tasks, ranked by priority.');

    case VOICE_INTENTS.PLAN_DAY:
      go(assistantRoute(parsed.raw || 'Plan my day'));
      return info('Planning your day…');

    case VOICE_INTENTS.WHAT_NOW:
      go(assistantRoute(parsed.raw || 'What should I do now?'));
      return info('Finding your next best action…');

    case VOICE_INTENTS.BREAK_DOWN:
      go(assistantRoute(parsed.raw || 'Break down my biggest task'));
      return info('Breaking down your top task…');

    case VOICE_INTENTS.RESCHEDULE:
      go(assistantRoute(parsed.raw || 'Reschedule my missed tasks'));
      return info('Rescheduling your missed work…');

    default:
      return warn(
        `I didn't catch a command in "${parsed?.raw || ''}". Try "plan my day", "add task …", or "what should I do now".`,
      );
  }
}
