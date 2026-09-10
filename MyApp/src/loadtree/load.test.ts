/// <reference types="node" />
import assert from 'node:assert';
import { makeDemo, sampleTask, seedTask } from './demo';
import { reducer } from './state';
import { planWork } from './planner';
import { Dimension, remaining } from './model';
import { ORDER, dimensionLoad, loadScores, toneFor } from './load';

const scoresOf = (s: Parameters<typeof loadScores>[0]) =>
  Object.fromEntries(loadScores(s).map(l => [l.id, l.score])) as Record<Dimension, number>;

const base = makeDemo(true);
const start = scoresOf(base);

// Every score is derived from the sample week, not hardcoded in the UI.
assert.deepEqual(start, { mental: 51, time: 55, physical: 27, social: 40, errands: 35 });
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
assert.equal(loaded.mental, 73, '5h of focused work raises the mental branch');
assert.equal(loaded.time, 68, 'The same work raises overall time pressure');
for (const id of ['physical', 'social', 'errands'] as Dimension[]) assert.equal(loaded[id], start[id], `${id} is untouched by a report`);
assert.equal(dimensionLoad(withReport, 'mental').tone, 'moderate');

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
