/// <reference types="node" />
import assert from 'node:assert';
import { makeClassicDemo as makeDemo, sampleTask, seedTask } from './demo';
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

// Every score is derived from the week, not hardcoded in the UI. (Exact values depend on the
// reference sizes, which are tuned for a real student's week; these checks test the behaviour.)
assert(Object.values(start).every(score => score > 0 && score <= 100), 'Every area has some load, none maxed out');
assert.deepEqual([start.physical, start.errands], [16, 35], 'Areas with fixed references score as before');
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
assert(loaded.mental > start.mental, '5h of focused work raises the mental branch');
assert(loaded.time > start.time, 'The same work raises overall time pressure');
for (const id of ['physical', 'social', 'errands'] as Dimension[]) assert.equal(loaded[id], start[id], `${id} is untouched by a report`);
assert.equal(dimensionLoad(withReport, 'mental').tone, toneFor(loaded.mental), 'The branch colour follows its score');

// A heavier task load elevates the branch score and changes its tone
const heavyTask: Task = {
  id: 'heavy-study', title: 'Exam prep sprint', deadline: `${WEEK[4]}T18:00`, demand: 'high',
  steps: [{ id: 's1', title: 'Sprint', estimate: 1200, remaining: 1200 }]
};
const heavyState = reducer(withReport, { type: 'saveTask', task: heavyTask });
const heavyScores = scoresOf(heavyState);
assert(heavyScores.mental > loaded.mental, 'Heavy task load increases mental score');
assert.equal(dimensionLoad(heavyState, 'mental').tone, toneFor(heavyScores.mental), 'Tone follows score');

// Finishing the work returns the branches to where they started.
let done = withReport;
for (const step of task.steps) done = reducer(done, { type: 'progress', taskId: task.id, stepId: step.id, remaining: 0 });
assert.equal(remaining(done.tasks[0]), 0);
assert.deepEqual(scoresOf(done), scoresOf({ ...base, tasks: [] }), 'Completed work stops counting as load');

// Time is measured unweighted, so its contributor minutes are the raw week.
assert.equal(dimensionLoad(base, 'time').minutes, 600);
assert.equal(dimensionLoad(withReport, 'time').minutes, 750);

// Deterministic capture: a report-shaped title seeds the prepared roadmap.
const seeded = seedTask('Marketing report due Friday', 'report');
assert.equal(seeded.title, 'Marketing report');
assert.equal(remaining(seeded), 300);
assert.equal(seedTask('Call the dentist', 'x').steps.length, 0, 'Anything else opens an empty roadmap');

console.log('LoadTree: load scores derived from state, recovery excluded, capture seed passed.');
