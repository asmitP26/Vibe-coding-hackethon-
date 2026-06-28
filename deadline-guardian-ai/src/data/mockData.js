/*
 * mockData - Day 1 demo content for Deadline Guardian AI.
 * Deadlines use naive local ISO strings (no "Z") so they render consistently
 * regardless of timezone. Replace with real/AI data later.
 */

const HOUR = 60 * 60 * 1000;
/** ISO timestamp offset from "now" so demo reminders stay relative to the current time. */
const reminderOffset = (ms) => new Date(Date.now() + ms).toISOString();

export const user = {
  name: 'Asmit',
  firstName: 'Asmit',
  initials: 'A',
  email: 'asmit@deadlineguardian.ai',
};

export const tasks = [
  {
    id: 't1',
    title: 'Submit database assignment',
    description: 'Finish and submit the DBMS assignment on the college portal before the deadline.',
    category: 'Study',
    deadline: '2026-06-28T21:00:00',
    estimatedEffort: 3,
    importance: 5,
    status: 'in-progress',
    priorityScore: 95,
    riskLevel: 'critical',
    aiReason:
      'Your most urgent deadline tonight - a few focused hours now means you submit with time to spare.',
    tags: ['assignment', 'database'],
    subtasks: [
      { id: 't1s1', title: 'Finalize ER diagram & schema', done: true },
      { id: 't1s2', title: 'Write and test the SQL queries', done: false },
      { id: 't1s3', title: 'Add normalization notes & write-up', done: false },
      { id: 't1s4', title: 'Proofread and submit on the portal', done: false },
    ],
  },
  {
    id: 't2',
    title: 'Review project proposal',
    description: 'Read the team project proposal and leave clear feedback before the review meeting.',
    category: 'Work',
    deadline: '2026-06-28T19:00:00',
    estimatedEffort: 2,
    importance: 4,
    status: 'todo',
    priorityScore: 84,
    riskLevel: 'high',
    aiReason: 'Time-sensitive review due this evening - block a focused hour to give clear, useful feedback.',
    tags: ['review', 'work'],
    reminderEnabled: true,
    reminderAt: reminderOffset(-1.5 * HOUR),
    reminderTriggered: true,
    reminderSnoozed: false,
    subtasks: [
      { id: 't2s1', title: 'Read the full proposal document', done: false },
      { id: 't2s2', title: 'Check scope, timeline & budget', done: false },
      { id: 't2s3', title: 'Leave inline comments & questions', done: false },
    ],
  },
  {
    id: 't3',
    title: 'Prepare for technical interview',
    description: 'Revise core concepts and practice questions ahead of the technical interview.',
    category: 'Career',
    deadline: '2026-06-29T18:00:00',
    estimatedEffort: 4,
    importance: 4,
    status: 'todo',
    priorityScore: 82,
    riskLevel: 'high',
    aiReason: 'A high-stakes interview tomorrow - a solid prep block today will pay off when it counts.',
    tags: ['interview', 'career'],
    subtasks: [
      { id: 't3s1', title: 'Review core DSA topics (arrays, trees, graphs)', done: true },
      { id: 't3s2', title: 'Practice 3 system-design questions', done: false },
      { id: 't3s3', title: 'Prepare STAR behavioral answers', done: false },
      { id: 't3s4', title: 'Do one timed mock interview', done: false },
    ],
  },
  {
    id: 't4',
    title: 'Pay electricity bill',
    description: 'Clear the monthly electricity bill before the cut-off to avoid a late fee.',
    category: 'Personal',
    deadline: '2026-06-29T10:00:00',
    estimatedEffort: 0.25,
    importance: 3,
    status: 'todo',
    priorityScore: 66,
    riskLevel: 'attention',
    aiReason: 'A two-minute payment that is easy to forget - clear it before tomorrow morning\u2019s cut-off.',
    tags: ['bill', 'finance'],    reminderEnabled: true,
    reminderAt: reminderOffset(3 * HOUR),
    reminderTriggered: false,
    reminderSnoozed: false,    subtasks: [],
  },
  {
    id: 't5',
    title: 'Prepare weekly report',
    description: 'Compile this week\u2019s progress and blockers into the team status report.',
    category: 'Work',
    deadline: '2026-07-03T17:00:00',
    estimatedEffort: 1.5,
    importance: 3,
    status: 'todo',
    priorityScore: 58,
    riskLevel: 'attention',
    aiReason: 'Due Friday and quick to compile - batch it once your week\u2019s data is ready.',
    tags: ['report', 'work'],
    subtasks: [
      { id: 't5s1', title: 'Gather this week\u2019s metrics', done: false },
      { id: 't5s2', title: 'Summarize progress & blockers', done: false },
      { id: 't5s3', title: 'Format and send to the team', done: false },
    ],
  },
  {
    id: 't6',
    title: 'Book doctor appointment',
    description: 'Schedule the routine health check-up sometime this week.',
    category: 'Personal',
    deadline: '2026-07-01T11:00:00',
    estimatedEffort: 0.33,
    importance: 2,
    status: 'todo',
    priorityScore: 50,
    riskLevel: 'attention',
    aiReason: 'A small but important errand - book it this week before the good slots fill up.',
    tags: ['health', 'errand'],
    subtasks: [],
  },
  {
    id: 't7',
    title: 'Complete online course module',
    description: 'Finish the next module of the online course and the end-of-module quiz.',
    category: 'Learning',
    deadline: '2026-07-05T18:00:00',
    estimatedEffort: 2,
    importance: 2,
    status: 'todo',
    priorityScore: 40,
    riskLevel: 'safe',
    aiReason: 'Steady learning pays off - finish this module over the weekend to stay on pace.',
    tags: ['course', 'learning'],
    subtasks: [],
  },
  {
    id: 't8',
    title: 'Practice DSA problems',
    description: 'Daily problem-solving set to keep your coding and interview skills sharp.',
    category: 'Habit',
    deadline: null,
    recurring: true,
    estimatedEffort: 1,
    importance: 3,
    status: 'todo',
    priorityScore: 38,
    riskLevel: 'safe',
    aiReason: 'A recurring habit that compounds - a short set today keeps your streak alive.',
    tags: ['recurring', 'practice'],
    subtasks: [],
  },
];

export const habits = [
  {
    id: 'h1',
    name: 'Daily DSA Practice',
    emoji: '🧩',
    color: 'blue',
    streak: 12,
    target: 1,
    completedToday: true,
    weekly: [1, 1, 1, 0, 1, 1, 1],
  },
  {
    id: 'h2',
    name: 'Morning Planning',
    emoji: '🗒️',
    color: 'indigo',
    streak: 8,
    target: 1,
    completedToday: true,
    weekly: [1, 1, 0, 1, 1, 1, 1],
  },
  {
    id: 'h3',
    name: 'Read 30 Minutes',
    emoji: '📚',
    color: 'emerald',
    streak: 5,
    target: 1,
    completedToday: false,
    weekly: [1, 0, 1, 1, 0, 1, 0],
  },
  {
    id: 'h4',
    name: 'Sleep by 12 AM',
    emoji: '🌙',
    color: 'violet',
    streak: 3,
    target: 1,
    completedToday: false,
    weekly: [0, 1, 1, 0, 1, 0, 1],
  },
];

export const scheduleBlocks = [
  { id: 'b1', title: 'Deep Work - Database assignment', start: '09:30', end: '11:30', type: 'focus', taskId: 't1' },
  { id: 'b2', title: 'Review project proposal', start: '11:45', end: '12:45', type: 'work', taskId: 't2' },
  { id: 'b3', title: 'Technical interview prep', start: '14:00', end: '16:00', type: 'work', taskId: 't3' },
  { id: 'b4', title: 'DSA practice set', start: '16:30', end: '17:30', type: 'habit', taskId: 't8' },
  { id: 'b5', title: 'Finalize & submit assignment', start: '19:30', end: '21:00', type: 'focus', taskId: 't1' },
];

export const recommendations = [
  {
    id: 'r1',
    emoji: '📝',
    title: 'Submit the database assignment tonight',
    detail: "It's your highest-risk deadline (today, 9 PM). Start with the SQL queries.",
    tone: 'critical',
  },
  {
    id: 'r2',
    emoji: '🔍',
    title: 'Review the project proposal first',
    detail: "It's due this evening - a focused hour now keeps it from slipping.",
    tone: 'high',
  },
  {
    id: 'r3',
    emoji: '🎯',
    title: "Prep for tomorrow's interview",
    detail: 'Four hours of prep will steady your nerves - block focused time today.',
    tone: 'high',
  },
  {
    id: 'r4',
    emoji: '⚡',
    title: 'Pay the electricity bill',
    detail: 'A two-minute task due tomorrow morning - knock it out tonight.',
    tone: 'attention',
  },
  {
    id: 'r5',
    emoji: '🔥',
    title: 'Keep your 12-day DSA streak alive',
    detail: 'A short practice set today maintains your momentum.',
    tone: 'safe',
  },
];

export const dailyGoals = [
  { id: 'g1', title: 'Submit the database assignment', progress: 60 },
  { id: 'g2', title: 'Solve 5 DSA problems', progress: 40 },
  { id: 'g3', title: 'Finish interview prep checklist', progress: 25 },
];

export const productivityStats = {
  completionRate: 78,
  tasksCompleted: 24,
  missedDeadlines: 2,
  highRiskTasks: 3,
  productivityScore: 82,
  focusHours: 31,
  trend: [
    { day: 'Mon', score: 64, completed: 3 },
    { day: 'Tue', score: 72, completed: 4 },
    { day: 'Wed', score: 58, completed: 2 },
    { day: 'Thu', score: 80, completed: 5 },
    { day: 'Fri', score: 76, completed: 4 },
    { day: 'Sat', score: 88, completed: 6 },
    { day: 'Sun', score: 82, completed: 5 },
  ],
  byCategory: [
    { name: 'Study', value: 8 },
    { name: 'Work', value: 6 },
    { name: 'Career', value: 5 },
    { name: 'Personal', value: 4 },
  ],
};

export const dailyBrief = {
  greeting: 'Good evening, Asmit',
  summary:
    'You have 1 critical deadline tonight - the database assignment at 9:00 PM - plus a proposal review due this evening. Tomorrow brings your technical interview. Your DSA streak is strong at 12 days. Focus the next few hours on the assignment and let the rest flow around it.',
  highlights: [
    'Database assignment is due tonight at 9:00 PM',
    "Technical interview prep is tomorrow's big rock",
    'One quick win waiting: pay the electricity bill',
  ],
};

export const assistantMessages = [
  {
    id: 'm1',
    role: 'assistant',
    content:
      "Good evening, Asmit! I'm your Productivity Copilot. Your database assignment is the critical deadline tonight - want me to plan the next few hours around it?",
  },
  { id: 'm2', role: 'user', content: 'What should I do right now?' },
  {
    id: 'm3',
    role: 'assistant',
    content:
      'Knock out the project-proposal review first since it’s due at 7:00 PM, then give the database assignment a focused block before its 9:00 PM deadline. Shall I generate the full plan?',
  },
];

export const quickPrompts = [
  'Plan my day',
  'Next best action',
  'Show risks',
  'Replan',
];

export default {
  user,
  tasks,
  habits,
  scheduleBlocks,
  recommendations,
  dailyGoals,
  productivityStats,
  dailyBrief,
  assistantMessages,
  quickPrompts,
};
