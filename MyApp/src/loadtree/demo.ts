import { AppState, Block, Commitment, Task, WEEK } from './model';

// Alex's week. Friday evening already holds the remaining database work, so a
// new Friday shift is a genuine clash rather than a contrived one.
export function makeDemo(setupDone = false): AppState {
  const commitments: Commitment[] = [
    { id: 'lecture', title: 'Marketing lecture', date: WEEK[0], start: 540, end: 660, kind: 'fixed', dimension: 'mental', demand: 'high' },
    { id: 'seminar', title: 'Research seminar', date: WEEK[1], start: 600, end: 720, kind: 'fixed', dimension: 'mental', demand: 'medium' },
    { id: 'friend', title: 'Lunch with Mei', date: WEEK[2], start: 720, end: 780, kind: 'fixed', dimension: 'social', demand: 'low' },
    { id: 'gym', title: 'Gym session', date: WEEK[3], start: 960, end: 1050, kind: 'flexible', dimension: 'physical', demand: 'medium', moveWindows: [{ date: WEEK[6], start: 600, end: 690 }] },
    { id: 'errand', title: 'Collect stationery', date: WEEK[2], start: 1080, end: 1140, kind: 'flexible', dimension: 'errands', demand: 'low', moveWindows: [{ date: WEEK[5], start: 600, end: 660 }] },
    ...WEEK.map((date, i): Commitment => ({ id: `sleep-${i}`, title: 'Protected sleep', date, start: 1320, end: 1440, kind: 'recovery', dimension: 'physical', demand: 'low' })),
  ];
  return {
    version: 1, revision: 0, undo: null, setupDone,
    now: `${WEEK[0]}T08:00`,
    preferences: {
      name: 'Alex', dailyLimit: 150, avoidAfterShift: true,
      availability: [
        // Tuesday and Wednesday evenings are mostly spoken for, so a crowded
        // Friday forces a real choice: give up Monday evening, or move the gym.
        { date: WEEK[0], start: 1080, end: 1140 },
        { date: WEEK[2], start: 1080, end: 1140 },
        { date: WEEK[3], start: 960, end: 1230 },
        // Leaves a real 90-minute window before Friday's incoming work shift.
        // Together with moving the flexible errand, the second demo task fits.
        { date: WEEK[4], start: 780, end: 870 },
        { date: WEEK[4], start: 1080, end: 1260 },
      ],
    },
    commitments,
    tasks: [databaseAssignment()],
    blocks: databaseBlocks(),
  };
}

/** The task the demo opens on: one subtask done, 2h 30m still to do. */
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
export function emptyWeek(): AppState {
  const demo = makeDemo();
  return { ...demo, preferences: { ...demo.preferences, name: '', availability: [] }, commitments: [], tasks: [], blocks: [] };
}
