import assert from 'node:assert';
import { makeDemo } from './demo';
import { conflictOptions, findConflict, optionMetrics, parseInput, taskFromInput } from './conflict';
import { planWork, validatePlan } from './planner';
import { reducer } from './state';
import { remaining, stamp } from './model';
import { planChanges } from './planChanges';

const state = makeDemo(true);
const text = 'I have work Friday from 6pm to 10pm';
const parsed = parseInput(text, state);
assert(parsed.commitment);
assert.equal(parsed.commitment.date, '2026-09-11');
assert.equal(parsed.commitment.start, 1080);
assert.equal(parsed.commitment.end, 1320);
assert.deepEqual(parseInput(text, state), parsed, 'Offline parsing is deterministic');
const conflict = findConflict(state, parsed.commitment);
assert.equal(conflict.task?.id, 'database');
assert.equal(conflict.displacedMinutes, 150);
const before = JSON.stringify(state);
const options = conflictOptions(state, conflict);
assert.equal(options.length, 3, 'Demo offers A, B, and C');
const [a, b, c] = options.map(o => optionMetrics(state, o, conflict));
assert.equal(a.conflictsLeft, 0);
assert.equal(b.conflictsLeft, 0);
assert.equal(c.conflictsLeft, 1, 'Rejecting work leaves the incoming request unresolved');
assert(a.protectedKept && b.protectedKept && c.protectedKept);
assert(b.moved > a.moved, 'B also moves the gym');
assert.equal(c.moved, 0);
for (const [i, option] of options.entries()) {
  const final = option.blocks.filter(block => block.taskId === 'database').map(block => stamp(block, true)).sort().pop()!;
  const expected = (Date.parse(`${state.tasks[0].deadline}Z`) - Date.parse(`${final}Z`)) / 60000;
  assert.equal(optionMetrics(state, option, conflict).bufferMinutes, expected);
  assert.deepEqual(validatePlan(state, option.tasks, option.commitments, option.blocks), [], `Option ${i} remains valid`);
}
const changedProtection = { ...options[1], commitments: options[1].commitments.filter(c => c.id !== 'sleep-0') };
assert.equal(optionMetrics(state, changedProtection, conflict).protectedKept, false);
const invalid = { ...options[1], blocks: [] };
assert(optionMetrics(state, invalid, conflict).conflictsLeft > 0, 'Unscheduled work is not presented as conflict-free');
assert.equal(JSON.stringify(state), before, 'Metrics and previews do not mutate state');
const applied = reducer(state, { type: 'approve', plan: options[1] });
assert(applied.commitments.some(c => c.id === parsed.commitment!.id));
assert.equal(applied.commitments.find(c => c.id === 'gym')?.date, '2026-09-13');
const undone = reducer(applied, { type: 'undo' });
assert.deepEqual(undone.blocks, state.blocks);
assert.deepEqual(undone.commitments, state.commitments);
assert.equal(reducer(applied, { type: 'approve', plan: options[0] }), applied, 'Stale option cannot apply');

const task = taskFromInput('Marketing report due Friday, about 1 hour', applied)!;
assert(task);
assert.equal(remaining(task), 60);
assert.equal(task.steps.length, 4);
assert.equal(task.deadline, '2026-09-11T23:59');
const taskPlan = planWork(applied, [...applied.tasks, task]);
assert(taskPlan.candidates.length > 0, 'The report can be proposed after option B');
for (const minutes of [15, 30, 45, 60, 90, 180, 300]) {
  const task = taskFromInput(`Database assignment due Friday, ${minutes} minutes`, state)!;
  assert.equal(remaining(task), minutes);
  assert(task.steps.every(s => s.remaining >= 15));
}
assert.equal(taskFromInput('Marketing report', state), null);
assert.equal(taskFromInput('Dentist Friday', state), null);
assert(planChanges(state, { ...options[0], blocks: state.blocks, commitments: [...state.commitments, parsed.commitment] }).days.has(parsed.commitment.date));
console.log('Visual flow: parse → 3 options → metrics → apply B → undo → task proposal passed.');
