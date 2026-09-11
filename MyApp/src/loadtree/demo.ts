import { AppState, Block, Commitment, Task, WEEK, Window, addDays, weekly } from './model';
import { planWork } from './planner';

// ---------- Alex: a computer science student in the debate club ----------
//
// A real student's fortnight: lectures and labs, meals, the gym, laundry, debate practice,
// friends and family — and three deadlines already on the go, with a debate competition on
// Saturday 19 September. A hackathon due Monday 21 September lands on the same fortnight.

type Slot = [title: string, start: number, end: number, kind: Commitment['kind'], dimension: Commitment['dimension'], demand: Commitment['demand']];

/** Alex's weekly timetable, Monday to Sunday. Lunch, dinner and sleep are rest: always kept free. */
const TIMETABLE: Slot[][] = [
  [['Data Structures lecture', 540, 660, 'fixed', 'mental', 'high'], ['Lunch', 720, 780, 'recovery', 'physical', 'low'],
    ['Operating Systems lab', 840, 960, 'fixed', 'mental', 'high'], ['Dinner', 1140, 1200, 'recovery', 'physical', 'low']],
  [['Algorithms lecture', 600, 720, 'fixed', 'mental', 'high'], ['Lunch', 720, 780, 'recovery', 'physical', 'low'],
    ['Gym', 960, 1050, 'flexible', 'physical', 'medium'], ['Dinner', 1140, 1200, 'recovery', 'physical', 'low'],
    ['Debate club practice', 1200, 1290, 'fixed', 'social', 'medium']],
  [['Discrete Maths tutorial', 540, 600, 'fixed', 'mental', 'medium'], ['Lunch with friends', 720, 780, 'fixed', 'social', 'low'],
    ['Laundry & groceries', 1020, 1080, 'flexible', 'errands', 'low'], ['Dinner', 1140, 1200, 'recovery', 'physical', 'low']],
  [['Database Systems lecture', 660, 780, 'fixed', 'mental', 'high'], ['Lunch', 780, 840, 'recovery', 'physical', 'low'],
    ['Debate team prep', 1080, 1140, 'fixed', 'social', 'medium'], ['Dinner', 1140, 1200, 'recovery', 'physical', 'low']],
  [['Software Engineering lecture', 540, 660, 'fixed', 'mental', 'high'], ['Lunch', 720, 780, 'recovery', 'physical', 'low'],
    ['Movie night with friends', 1140, 1320, 'fixed', 'social', 'low']],
  [['Hang out with friends', 840, 1020, 'fixed', 'social', 'low'], ['Dinner', 1140, 1200, 'recovery', 'physical', 'low']],
  [['Call home', 660, 720, 'fixed', 'social', 'low'], ['Dinner', 1140, 1200, 'recovery', 'physical', 'low']],
];

/** When Alex can do focused work (coursework, the hackathon): weekday gaps between classes. Weekends stay free. */
const FOCUS: [day: number, start: number, end: number][] = [
  [0, 990, 1110],   // Mon 4:30–6:30 PM, after the OS lab
  [1, 780, 960],    // Tue 1:00–4:00 PM, before the gym
  [2, 600, 720],    // Wed 10:00 AM–noon
  [2, 780, 1020],   // Wed 1:00–5:00 PM
  [3, 840, 1080],   // Thu 2:00–6:00 PM
  [4, 780, 1110],   // Fri 1:00–6:30 PM
];

const COMPETITION = addDays(WEEK[5], 7); // Saturday 19 September
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function alexCommitments(): Commitment[] {
  const commitments: Commitment[] = [];
  WEEK.forEach((first, day) => weekly(first).forEach(date => TIMETABLE[day].forEach(([title, start, end, kind, dimension, demand]) => {
    // The competition takes the whole Saturday; that week's hangout does not happen.
    if (date === COMPETITION && start < 1080 && end > 540) return;
    const c: Commitment = { id: `${slug(title)}-${date}`, title, date, start, end, kind, dimension, demand };
    // Flexible things can move to the weekend if a plan needs the time: the gym to Saturday morning, chores to Sunday.
    if (kind === 'flexible') { const at = title === 'Gym' ? 600 : 960; c.moveWindows = [{ date: addDays(date, 4), start: at, end: at + end - start }]; }
    commitments.push(c);
  })));
  commitments.push({ id: 'debate-competition', title: 'Debate competition', date: COMPETITION, start: 540, end: 1080, kind: 'fixed', dimension: 'social', demand: 'high' });
  WEEK.flatMap(weekly).forEach(date => commitments.push({ id: `sleep-${date}`, title: 'Protected sleep', date, start: 1320, end: 1440, kind: 'recovery', dimension: 'physical', demand: 'low' }));
  return commitments;
}

const step = (task: string, id: string, title: string, minutes: number, done = false) =>
  ({ id: `${task}-${id}`, title, estimate: minutes, remaining: done ? 0 : minutes });

/** The coursework already on the go when the demo opens — about 20 hours of it. */
function alexTasks(): Task[] {
  const due = (date: string) => `${date}T23:59`;
  return [
    { id: 'algorithms', title: 'Algorithms problem set', deadline: due(WEEK[3]), demand: 'high', steps: [
      step('algorithms', 'read', 'Read the problems', 30, true), step('algorithms', 'q1', 'Solve Q1–Q3', 90),
      step('algorithms', 'q4', 'Solve Q4–Q6', 90), step('algorithms', 'check', 'Check & submit', 30)] },
    { id: 'database', title: 'Database project milestone', deadline: due(addDays(WEEK[4], 7)), demand: 'high', steps: [
      step('database', 'schema', 'Design the schema', 120), step('database', 'api', 'Build the API', 240),
      step('database', 'tests', 'Write tests', 120), step('database', 'report', 'Write the report', 120)] },
    { id: 'debate', title: 'Debate case prep', deadline: due(addDays(WEEK[4], 7)), demand: 'high', steps: [
      step('debate', 'research', 'Research the motion', 120), step('debate', 'case', 'Write the case', 120),
      step('debate', 'rebuttal', 'Rebuttal drills', 90), step('debate', 'run', 'Final run-through', 60)] },
  ];
}

export function makeDemo(setupDone = false): AppState {
  const base: AppState = {
    version: 1, revision: 0, undo: null, setupDone,
    now: `${WEEK[0]}T08:00`,
    preferences: {
      name: 'Alex', dailyLimit: 180, avoidAfterShift: true,
      availability: FOCUS.flatMap(([day, start, end]) => weekly(WEEK[day]).map(date => ({ date, start, end }))),
    },
    commitments: alexCommitments(),
    tasks: alexTasks(),
    blocks: [],
  };
  // The existing coursework is laid out by the planner itself, so the opening week is always a valid plan.
  const plan = planWork(base, base.tasks).candidates[0];
  return { ...base, blocks: plan?.blocks ?? [] };
}

export function emptyWeek(): AppState {
  const demo = makeDemo();
  return { ...demo, preferences: { ...demo.preferences, name: '', availability: [] }, commitments: [], tasks: [], blocks: [] };
}

// ---------- the classic sample week (used by the planner's own tests) ----------

// Friday evening already holds the remaining database work, so a new Friday shift is a
// genuine clash rather than a contrived one. Study time and sleep repeat across the horizon.
export function makeClassicDemo(setupDone = false): AppState {
  const commitments: Commitment[] = [
    { id: 'lecture', title: 'Marketing lecture', date: WEEK[0], start: 540, end: 660, kind: 'fixed', dimension: 'mental', demand: 'high' },
    { id: 'seminar', title: 'Research seminar', date: WEEK[1], start: 600, end: 720, kind: 'fixed', dimension: 'mental', demand: 'medium' },
    { id: 'friend', title: 'Lunch with Mei', date: WEEK[2], start: 720, end: 780, kind: 'fixed', dimension: 'social', demand: 'low' },
    { id: 'gym', title: 'Gym session', date: WEEK[3], start: 960, end: 1050, kind: 'flexible', dimension: 'physical', demand: 'medium', moveWindows: [{ date: WEEK[6], start: 600, end: 690 }] },
    { id: 'errand', title: 'Collect stationery', date: WEEK[2], start: 1080, end: 1140, kind: 'flexible', dimension: 'errands', demand: 'low', moveWindows: [{ date: WEEK[5], start: 600, end: 660 }] },
    ...WEEK.flatMap(weekly).map((date, i): Commitment => ({ id: `sleep-${i}`, title: 'Protected sleep', date, start: 1320, end: 1440, kind: 'recovery', dimension: 'physical', demand: 'low' })),
  ];
  const routine: Window[] = [
    { date: WEEK[0], start: 1080, end: 1140 },
    { date: WEEK[2], start: 1080, end: 1140 },
    { date: WEEK[3], start: 960, end: 1230 },
    { date: WEEK[4], start: 780, end: 870 },
    { date: WEEK[4], start: 1080, end: 1260 },
  ];
  return {
    version: 1, revision: 0, undo: null, setupDone,
    now: `${WEEK[0]}T08:00`,
    preferences: { name: 'Alex', dailyLimit: 150, avoidAfterShift: true, availability: routine.flatMap(w => weekly(w.date).map(date => ({ ...w, date }))) },
    commitments,
    tasks: [databaseAssignment()],
    blocks: databaseBlocks(),
  };
}

/** The classic week's task: one subtask done, 2h 30m still to do. */
export function databaseAssignment(): Task {
  return {
    id: 'database', title: 'Database assignment', deadline: `${WEEK[4]}T23:59`, demand: 'high',
    steps: [
      { id: 'database-schema', title: 'Research schema', estimate: 30, remaining: 0 },
      { id: 'database-build', title: 'Build the database', estimate: 75, remaining: 75 },
      { id: 'database-queries', title: 'Write SQL queries', estimate: 45, remaining: 45 },
      { id: 'database-review', title: 'Final review', estimate: 30, remaining: 30 },
    ],
  };
}

/** Friday 6:00–8:30 PM, which is exactly what a 6–10 PM shift would take away. */
function databaseBlocks(): Block[] {
  return [
    { id: 'database/database-build/fri', taskId: 'database', stepId: 'database-build', title: 'Build the database', date: WEEK[4], start: 1080, end: 1155 },
    { id: 'database/database-queries/fri', taskId: 'database', stepId: 'database-queries', title: 'Write SQL queries', date: WEEK[4], start: 1155, end: 1200 },
    { id: 'database/database-review/fri', taskId: 'database', stepId: 'database-review', title: 'Final review', date: WEEK[4], start: 1200, end: 1230 },
  ];
}

export function sampleTask(title = 'Marketing report', id = 'report'): Task {
  return { id, title, deadline: `${WEEK[4]}T12:00`, demand: 'high', steps: [
    { id: `${id}-research`, title: 'Gather three useful sources', estimate: 60, remaining: 60 },
    { id: `${id}-outline`, title: 'Outline the key arguments', estimate: 30, remaining: 30 },
    { id: `${id}-draft`, title: 'Write the first draft', estimate: 150, remaining: 150 },
    { id: `${id}-edit`, title: 'Edit, reference & submit', estimate: 60, remaining: 60 },
  ] };
}
// Deterministic capture for the demo: a report-shaped title gets the prepared
// roadmap, anything else opens an empty roadmap the student fills in. No live AI.
export function seedTask(input: string, id = `task-${Date.now()}`): Task {
  const title = input.trim().replace(/\s+due\s+.*$/i, '').trim() || input.trim();
  if (/report|essay|assignment|paper|thesis/i.test(input)) return sampleTask(title, id);
  return { id, title, demand: 'high', deadline: `${WEEK[4]}T12:00`, steps: [] };
}
