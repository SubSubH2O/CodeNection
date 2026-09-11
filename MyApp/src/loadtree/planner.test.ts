/// <reference types="node" />
import assert from 'node:assert';
import { makeClassicDemo as makeDemo, makeDemo as makeSample, sampleTask } from './demo';
import { planWork, validatePlan, futureCoverage } from './planner';
import { parseSaved, reducer, setupErrors } from './state';
import { remaining, stamp } from './model';

// These mechanics were written against a roomier week than the demo now uses.
const ROOMY = [
  { date: '2026-09-07', start: 1080, end: 1140 },
  { date: '2026-09-08', start: 1080, end: 1110 },
  { date: '2026-09-09', start: 1080, end: 1200 },
  { date: '2026-09-10', start: 960, end: 1230 },
  { date: '2026-09-11', start: 1080, end: 1260 },
];
const roomy = () => { const d = makeDemo(true); return { ...d, preferences: { ...d.preferences, availability: ROOMY } }; };
const original = roomy();
const task = sampleTask();
const plans = planWork(original, [task]);
assert.equal(plans.required, 300);
assert.equal(plans.candidates.length, 3, 'Three different feasible choices');
assert.deepEqual(planWork(original, [task]), plans, 'Deterministic results');
assert.equal(original.tasks.length, 1, 'Preview does not add the drafted task to state');
for (const plan of plans.candidates) {
  assert.deepEqual(validatePlan(original, plan.tasks, plan.commitments, plan.blocks), []);
  assert.equal(plan.blocks.reduce((sum, b) => sum + b.end - b.start, 0), 300);
  for (const fixed of original.commitments.filter(c => c.kind !== 'flexible')) assert.deepEqual(plan.commitments.find(c => c.id === fixed.id), fixed);
}
assert(plans.candidates[1].movedId, 'The second option moves a flexible commitment');
const approved = reducer(original, { type: 'approve', plan: plans.candidates[0] });
assert.equal(approved.tasks.length, 1, 'Approving applies the plan task list');
assert.strictEqual(reducer(approved, { type: 'approve', plan: plans.candidates[0] }), approved, 'Double approval and stale plans are ignored');
assert.deepEqual(reducer(approved, { type: 'undo' }).blocks, original.blocks);
const wednesday = reducer(approved, { type: 'advance' });
assert.equal(remaining(wednesday.tasks[0]), 210);
assert.equal(futureCoverage(wednesday, wednesday.tasks[0]), 210);
const setback = reducer(wednesday, { type: 'progress', taskId: task.id, stepId: 'report-draft', remaining: 210 });
assert.equal(remaining(setback.tasks[0]), 270);
const repairs = planWork(setback);
assert.equal(repairs.shortfall, 60);
assert.equal(repairs.candidates.length, 1);
assert.equal(repairs.candidates[0].movedId, 'errand');
const repaired = reducer(setback, { type: 'approve', plan: repairs.candidates[0] });
assert.equal(futureCoverage(repaired, repaired.tasks[0]), 270);
const impossibleTask = { ...task, steps: [{ id: 'huge', title: 'Huge report', estimate: 900, remaining: 900 }] };
const impossible = planWork(original, [impossibleTask]);
assert.equal(impossible.candidates.length, 0);
assert(impossible.shortfall > 0);
const expired = planWork(original, [{ ...task, deadline: '2026-09-06T12:00' }]);
assert.equal(expired.candidates.length, 0);
const occupied = { ...original, commitments: [...original.commitments, { ...original.commitments[0], id: 'saturday', date: '2026-09-12', start: 600, end: 660 }] };
assert.equal(planWork(occupied, [task]).candidates.map(c => c.id).includes('move-errand'), false, 'Occupied destination cannot be suggested');
const lowLimit = { ...original, preferences: { ...original.preferences, dailyLimit: 30 } };
assert.equal(planWork(lowLimit, [task]).candidates.length, 0);
const corrupt = { ...plans.candidates[0], blocks: plans.candidates[0].blocks.map((b, i) => i ? b : { ...b, date: '2026-09-11', start: 1300, end: 1360 }) };
assert(validatePlan(original, corrupt.tasks, corrupt.commitments, corrupt.blocks).length > 0);
assert.strictEqual(reducer(original, { type: 'approve', plan: corrupt }), original);
const swapped = { ...plans.candidates[0], blocks: plans.candidates[0].blocks.map((b, i, list) => i === 0 ? { ...b, stepId: list[1].stepId } : b) };
assert(validatePlan(original, swapped.tasks, swapped.commitments, swapped.blocks).length > 0);
assert.equal(parseSaved('broken'), null);
assert.equal(parseSaved(JSON.stringify(approved))?.tasks[0].title, task.title);
assert(setupErrors({ ...original.preferences, availability: [{ date: '2026-09-07', start: 1200, end: 1100 }] }, original.commitments).length > 0);
assert(setupErrors(original.preferences, [...original.commitments, { ...original.commitments[0], id: 'duplicate' }]).length > 0);
let completed = repaired;
for (const step of task.steps) completed = reducer(completed, { type: 'progress', taskId: task.id, stepId: step.id, remaining: 0 });
assert.equal(remaining(completed.tasks[0]), 0);
assert.equal(completed.blocks.filter(b => stamp(b) >= completed.now).length, 0);
// Reset brings back the app's sample (Alex's fortnight), whatever the mechanics above were tested on.
assert.deepEqual(reducer(completed, { type: 'reset' }).tasks.map(t => t.id), makeSample(true).tasks.map(t => t.id), 'Reset restores the sample fortnight, including its tasks');
console.log('LoadTree: deterministic plans, 60m repair, constraints, undo, stale approval, progress, persistence and reset passed.');
