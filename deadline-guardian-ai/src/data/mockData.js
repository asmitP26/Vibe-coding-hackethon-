/*
 * mockData - Day 1 demo content for Deadline Guardian AI.
 * Deadlines use naive local ISO strings (no "Z") so they render consistently
 * regardless of timezone. Replace with real/AI data later.
 */

export const user = {
  name: 'Asmit',
  firstName: 'Asmit',
  initials: 'A',
  email: 'asmit@deadlineguardian.ai',
  plan: 'Pro',
};

export const tasks = [
  {
    id: 't1',
    title: 'Complete Coding Ninjas hackathon MVP',
    description: 'Build and ship the core MVP for the Coding Ninjas hackathon submission.',
    category: 'Hackathon',
    deadline: '2026-06-28T23:00:00',
    estimatedEffort: 8,
    importance: 5,
    status: 'in-progress',
    priorityScore: 96,
    riskLevel: 'critical',
    aiReason:
      'Highest-impact deadline with the largest remaining effort - start now to avoid a last-minute crunch.',
    tags: ['MVP', 'priority'],
    subtasks: [
      { id: 't1s1', title: 'Set up project structure & routing', done: true },
      { id: 't1s2', title: 'Build core feature flow', done: false },
      { id: 't1s3', title: 'Polish UI and responsiveness', done: false },
      { id: 't1s4', title: 'Test end-to-end & fix bugs', done: false },
      { id: 't1s5', title: 'Deploy and verify submission', done: false },
    ],
  },
  {
    id: 't2',
    title: 'Prepare project README and Google Doc',
    description: 'Write the submission README and a polished Google Doc with screenshots.',
    category: 'Hackathon',
    deadline: '2026-06-28T20:00:00',
    estimatedEffort: 2,
    importance: 4,
    status: 'todo',
    priorityScore: 88,
    riskLevel: 'high',
    aiReason: 'Documentation is quickest while the build context is fresh - batch it right after coding.',
    tags: ['docs'],
    subtasks: [
      { id: 't2s1', title: 'Draft README structure', done: false },
      { id: 't2s2', title: 'Add architecture & setup steps', done: false },
      { id: 't2s3', title: 'Export Google Doc with screenshots', done: false },
    ],
  },
  {
    id: 't3',
    title: 'Attend mentor session',
    description: 'Join the scheduled mentor sync and bring blockers to discuss.',
    category: 'Career',
    deadline: '2026-06-24T16:00:00',
    estimatedEffort: 1,
    importance: 3,
    status: 'todo',
    priorityScore: 64,
    riskLevel: 'attention',
    aiReason: 'Scheduled mentor sync - confirm attendance and prep two questions.',
    tags: ['meeting'],
    subtasks: [],
  },
  {
    id: 't4',
    title: 'Pay electricity bill',
    description: 'Clear the monthly electricity bill before the cut-off.',
    category: 'Personal',
    deadline: '2026-06-25T10:00:00',
    estimatedEffort: 0.25,
    importance: 2,
    status: 'todo',
    priorityScore: 58,
    riskLevel: 'attention',
    aiReason: 'A quick 2-minute task that is time-sensitive - knock it out to reduce mental load.',
    tags: ['bill'],
    subtasks: [],
  },
  {
    id: 't5',
    title: 'Practice DSA problems',
    description: 'Daily problem-solving set to keep interview skills sharp.',
    category: 'Study',
    deadline: null,
    recurring: true,
    estimatedEffort: 1,
    importance: 3,
    status: 'todo',
    priorityScore: 42,
    riskLevel: 'safe',
    aiReason: 'Recurring habit that compounds - a short set tonight keeps the streak alive.',
    tags: ['recurring', 'study'],
    subtasks: [],
  },
  {
    id: 't6',
    title: 'Prepare interview answers',
    description: 'Refine STAR-format answers for upcoming interviews.',
    category: 'Career',
    deadline: '2026-06-27T21:00:00',
    estimatedEffort: 3,
    importance: 4,
    status: 'todo',
    priorityScore: 80,
    riskLevel: 'high',
    aiReason: 'Multi-hour prep with a near deadline - schedule one focused block.',
    tags: ['career'],
    subtasks: [
      { id: 't6s1', title: 'List 8 common questions', done: true },
      { id: 't6s2', title: 'Draft STAR answers', done: false },
      { id: 't6s3', title: 'Practice out loud', done: false },
    ],
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
  { id: 'b1', title: 'Deep Work - Hackathon MVP core', start: '09:00', end: '10:30', type: 'focus', taskId: 't1' },
  { id: 'b2', title: 'Write README & Google Doc', start: '11:00', end: '12:00', type: 'work', taskId: 't2' },
  { id: 'b3', title: 'DSA Practice Set', start: '14:00', end: '15:00', type: 'habit', taskId: 't5' },
  { id: 'b4', title: 'Interview Answer Prep', start: '16:00', end: '17:30', type: 'work', taskId: 't6' },
  { id: 'b5', title: 'Finalize & Deploy MVP', start: '21:00', end: '23:00', type: 'focus', taskId: 't1' },
];

export const recommendations = [
  {
    id: 'r1',
    emoji: '🚀',
    title: 'Start the MVP build now',
    detail: "It's your highest-risk deadline (tonight, 11 PM). Begin with the core feature.",
    tone: 'critical',
  },
  {
    id: 'r2',
    emoji: '📝',
    title: 'Batch the README right after coding',
    detail: 'Documentation is fastest while the build context is still fresh.',
    tone: 'high',
  },
  {
    id: 'r3',
    emoji: '⚡',
    title: 'Clear the electricity bill',
    detail: 'A 2-minute time-sensitive task - knock it out to reduce noise.',
    tone: 'attention',
  },
  {
    id: 'r4',
    emoji: '🧠',
    title: 'Protect a 2-hour focus block tonight',
    detail: 'Reserve distraction-free time to de-risk the MVP deadline.',
    tone: 'safe',
  },
  {
    id: 'r5',
    emoji: '🔥',
    title: 'Keep your 12-day DSA streak alive',
    detail: 'A short practice set tonight maintains your momentum.',
    tone: 'safe',
  },
];

export const dailyGoals = [
  { id: 'g1', title: 'Ship MVP core features', progress: 60 },
  { id: 'g2', title: 'Solve 5 DSA problems', progress: 40 },
  { id: 'g3', title: 'Submit README + Google Doc', progress: 25 },
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
    { name: 'Hackathon', value: 9 },
    { name: 'Study', value: 6 },
    { name: 'Career', value: 5 },
    { name: 'Personal', value: 4 },
  ],
};

export const dailyBrief = {
  greeting: 'Good evening, Asmit',
  summary:
    'You have 1 critical deadline tonight and 2 high-risk tasks this week. Your DSA streak is strong at 12 days. Focus the next 2 hours on the hackathon MVP - everything else can flow around it.',
  highlights: [
    'Hackathon MVP is due tonight at 11:00 PM',
    'README + interview prep are the next dominoes',
    'One quick win waiting: pay the electricity bill',
  ],
};

export const assistantMessages = [
  {
    id: 'm1',
    role: 'assistant',
    content:
      "Good evening, Asmit! I'm your Productivity Copilot. Your hackathon MVP is the critical deadline tonight - want me to plan the next few hours around it?",
  },
  { id: 'm2', role: 'user', content: 'What should I do right now?' },
  {
    id: 'm3',
    role: 'assistant',
    content:
      'Start with the MVP core feature - it carries the most risk and effort. I\u2019d block 9:00-10:30 for deep work, then write the README while context is fresh. Shall I generate the full plan?',
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
