/// <reference types="node" />
import assert from 'node:assert';
import { makeDemo, sampleTask, seedTask } from './demo';
import { reducer } from './state';
import { planWork } from './planner';
import { Dimension, Task, WEEK, remaining } from './model';
import { ORDER, dimensionLoad, loadScores, toneFor } from './load';

const scoresOf = (s: Parameters<typeof loadScores>[0]) =>
  Object.fromEntries(loadScores(s).map(l => [l.id, l.score])) as Record<Dimension, number>;

// These mechanics were written against a roomier week than the demo now uses.
const ROOMY = [
  { date: '2026-09-07', start: 1080, end: 1140 },
  { date: '2026-09-08', start: 1080, end: 1110 },
  { date: '2026-09-09', start: 1080, end: 1200 },
  { date: '2026-09-10', start: 960, end: 1230 },
  { date: '2026-09-11', start: 1080, end: 1260 },
];
const roomy = () => { const d = makeDemo(true); return { ...d, preferences: { ...d.preferences, availability: ROOMY } }; };
const base = roomy();
const start = scoresOf(base);

// Every score is derived from the sample week, not hardcoded in the UI.
assert.deepEqual(start, { mental: 34, time: 32, physical: 66, social: 57, errands: 17 });
for (const load of loadScores(base)) {
  assert(load.score >= 0 && load.score <= 100, 'Scores stay within 0-100');
  assert.equal(load.tone, toneFor(load.score));
}

// Protected recovery is never counted as load.
assert(base.commitments.some(c => c.kind === 'recovery'), 'The sample week protects recovery');
const recoveryTitles = base.commitments.filter(c => c.kind === 'recovery').map(c => c.title);
for (const id of ORDER) {
  for (const contributor of dimensionLoad(base, id).contributors) {
    assert(!recoveryTitles.includes(contributor.title), 'Recovery never appears as load');
  }
}

// Adding the report moves only the areas it actually touches.
const task = sampleTask();
const plan = planWork(base, [task]).candidates[0];
const withReport = reducer(base, { type: 'approve', plan });
const loaded = scoresOf(withReport);
assert.equal(loaded.mental, 42, '5h of focused work raises the mental branch');
assert.equal(loaded.time, 36, 'The same work raises overall time pressure');
for (const id of ['physical', 'social', 'errands'] as Dimension[]) assert.equal(loaded[id], start[id], `${id} is untouched by a report`);
assert.equal(dimensionLoad(withReport, 'mental').tone, 'calm');

// A heavier task load elevates the mental branch into 'moderate' (yellow).
const heavyTask: Task = {
  id: 'heavy-study', title: 'Exam prep sprint', deadline: `${WEEK[4]}T18:00`, demand: 'high',
  steps: [{ id: 's1', title: 'Sprint', estimate: 420, remaining: 420 }]
};
const heavyState = reducer(withReport, { type: 'saveTask', task: heavyTask });
const heavyScores = scoresOf(heavyState);
assert(heavyScores.mental >= 55, 'Heavy task load pushes mental score into moderate (>= 55%)');
assert.equal(dimensionLoad(heavyState, 'mental').tone, 'moderate', 'Tone changes to moderate');

// Finishing the work returns the branches to where they started.
let done = withReport;
for (const step of task.steps) done = reducer(done, { type: 'progress', taskId: task.id, stepId: step.id, remaining: 0 });
assert.equal(remaining(done.tasks[0]), 0);
assert.deepEqual(scoresOf(done), scoresOf({ ...base, tasks: [] }), 'Completed work stops counting as load');

// Time is measured unweighted, so its contributor minutes are the raw week.
assert.equal(dimensionLoad(base, 'time').minutes, 1260);
assert.equal(dimensionLoad(withReport, 'time').minutes, 1410);

// Deterministic capture: a report-shaped title seeds the prepared roadmap.
const seeded = seedTask('Marketing report due Friday', 'report');
assert.equal(seeded.title, 'Marketing report');
assert.equal(remaining(seeded), 300);
assert.equal(seedTask('Call the dentist', 'x').steps.length, 0, 'Anything else opens an empty roadmap');

console.log('LoadTree: load scores derived from state, recovery excluded, capture seed passed.');
