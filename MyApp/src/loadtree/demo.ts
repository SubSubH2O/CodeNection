import { AppState, Commitment, Task, WEEK } from './model';

export function makeDemo(setupDone = false): AppState {
  const commitments: Commitment[] = [
    { id: 'lecture', title: 'Marketing lecture', date: WEEK[0], start: 540, end: 660, kind: 'fixed', dimension: 'mental', demand: 'high' },
    { id: 'seminar', title: 'Research seminar', date: WEEK[1], start: 600, end: 720, kind: 'fixed', dimension: 'mental', demand: 'medium' },
    { id: 'shift', title: 'Campus café shift', date: WEEK[3], start: 840, end: 1020, kind: 'fixed', dimension: 'physical', demand: 'high' },
    { id: 'errand', title: 'Collect stationery', date: WEEK[2], start: 1080, end: 1140, kind: 'flexible', dimension: 'errands', demand: 'low', moveWindows: [{ date: WEEK[5], start: 600, end: 660 }] },
    { id: 'friend', title: 'Lunch with Mei', date: WEEK[2], start: 720, end: 780, kind: 'fixed', dimension: 'social', demand: 'low' },
    ...WEEK.slice(0, 5).map((date, i): Commitment => ({ id: `rest-${i}`, title: i === 2 ? 'Evening walk & unwind' : 'Evening downtime', date, start: 1260, end: 1380, kind: 'recovery', dimension: 'physical', demand: 'low' })),
  ];
  return {
    version: 1, revision: 0, undo: null, setupDone,
    now: `${WEEK[0]}T08:00`,
    preferences: { name: 'Alex', dailyLimit: 150, avoidAfterShift: true, availability: [
      { date: WEEK[0], start: 1080, end: 1140 },
      { date: WEEK[1], start: 1080, end: 1110 },
      { date: WEEK[2], start: 1080, end: 1200 },
      { date: WEEK[3], start: 1080, end: 1230 },
    ] },
    commitments, tasks: [], blocks: [],
  };
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
  return { ...demo, preferences: { ...demo.preferences, name: '', availability: [] }, commitments: [] };
}
