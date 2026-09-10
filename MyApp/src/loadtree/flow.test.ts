/// <reference types="node" />
import assert from 'node:assert';
import { makeDemo } from './demo';
import { buildTask, cleanTitle, converse, deadlineFrom, minutesFrom, readRange, respond } from './chat';
import { appliedSummary, planRequest } from './flow';
import { optionMetrics } from './conflict';
import { validatePlan } from './planner';
import { reducer } from './state';
import { Candidate, remaining, stamp } from './model';
import { slotKey } from './planChanges';

const state = makeDemo(true);
/** Says something, then agrees with the breakdown — the normal two-step exchange. */
const go = (s: typeof state, text: string) => { const t = converse(s, {}, text); return converse(s, t.draft, 'Looks right'); };
const untouched = (plan: Candidate) =>
  state.blocks.filter(b => stamp(b) >= state.now).every(b => plan.blocks.some(p => slotKey(p) === slotKey(b)));

// ---- reading messy sentences ----
assert.deepEqual(
  ['6pm to 10pm', '6-10pm', '11-2pm', '9-5', '18:00–22:00'].map(t => { const r = readRange(t); return r && [r.start, r.end]; }),
  [[1080, 1320], [1080, 1320], [660, 840], [540, 1020], [1080, 1320]],
);
assert.equal(readRange('about 3-4 hours'), null, 'An effort range is not a time range');
assert.equal(readRange('due 2026-09-11'), null, 'A date is not a time range');
assert.equal(minutesFrom('about 5 hours'), 300);
assert.equal(minutesFrom('1h 30m'), 90);
assert.equal(minutesFrom('90 mins'), 90);
assert.equal(minutesFrom('3-4 hours'), 210);
assert.equal(minutesFrom('3', true), 180, 'A bare number answers "how long?" in hours');
assert.equal(minutesFrom('3'), undefined, 'In a sentence, a bare number means nothing');
assert.equal(deadlineFrom('Essay due Thursday', state.now), '2026-09-10T23:59');
assert.equal(deadlineFrom('I have work Thursday', state.now), undefined, 'A day alone is not a deadline');
assert.equal(deadlineFrom('Thursday', state.now, true), '2026-09-10T23:59');
assert.equal(deadlineFrom('report due Friday at 5pm', state.now), '2026-09-11T17:00');
assert.equal(cleanTitle('I need to finish my database assignment by Friday, probably 3 hours'), 'Database assignment');
assert.equal(cleanTitle('Marketing report due Friday, about 5 hours'), 'Marketing report');
for (const minutes of [15, 30, 45, 60, 90, 120, 180, 300, 480]) {
  const task = buildTask(state, 'Marketing report', '2026-09-11T23:59', minutes);
  assert.equal(remaining(task), minutes, `${minutes} minutes are split without loss`);
  assert(task.steps.every(s => s.remaining >= 15 && s.remaining % 15 === 0));
}

// ---- 1. the breakdown is confirmed first, then it fits, in more than one way ----
const labAsk = converse(state, {}, 'Lab report due Thursday, about 2 hours');
assert(labAsk.messages.some(m => m.card), 'The breakdown arrives as a card, not a paragraph');
assert.equal(labAsk.draft.awaiting, 'confirm', 'Nothing is planned before the student agrees');
assert(!labAsk.ready);
const longer = converse(state, labAsk.draft, '3 hours');
assert.equal(longer.draft.awaiting, 'confirm', 'A correction shows the new breakdown and asks again');
assert.equal(remaining(longer.draft.proposal!.task!), 180);
const lab = converse(state, labAsk.draft, 'Looks right');
assert(lab.ready?.task, 'Agreeing hands the task to the planner');
const fits = planRequest(state, lab.ready!);
assert.equal(fits.kind, 'fits');
if (fits.kind === 'fits') {
  assert(fits.options.every(untouched), 'Fitting a task never moves what was already scheduled');
  assert.deepEqual(validatePlan(state, fits.plan.tasks, fits.plan.commitments, fits.plan.blocks), []);
  assert.equal(reducer(state, { type: 'approve', plan: fits.plan }).tasks.length, 2);
  assert(appliedSummary(state, fits.plan).startsWith('Done — '));
}

// ---- 2. missing details are asked for, one at a time ----
let turn = converse(state, {}, 'Study for stats midterm');
assert.equal(turn.draft.awaiting, 'deadline');
turn = converse(state, turn.draft, 'Thursday');
assert.equal(turn.draft.awaiting, 'effort');
turn = converse(state, turn.draft, '2 hours');
assert.equal(turn.draft.awaiting, 'confirm');
turn = converse(state, turn.draft, 'yes');
assert.equal(turn.ready?.task?.deadline, '2026-09-10T23:59');
assert.equal(remaining(turn.ready!.task!), 120);
const unclear = converse(state, { title: 'Essay', awaiting: 'deadline' }, 'soon');
assert.equal(unclear.draft.awaiting, 'deadline', 'An unclear answer is asked again, not guessed');
assert(!unclear.ready);
let shift = converse(state, {}, 'I have work on Friday');
assert.equal(shift.draft.awaiting, 'time', 'A commitment without a time asks for one');
shift = converse(state, shift.draft, '6-10pm');
shift = converse(state, shift.draft, 'Yes');
assert.deepEqual([shift.ready?.commitment?.date, shift.ready?.commitment?.start, shift.ready?.commitment?.end], ['2026-09-11', 1080, 1320]);

// ---- 3. overload: honest options, compared on the calendar ----
const work = go(state, 'I have work Friday from 6pm to 10pm');
const overload = planRequest(state, work.ready!);
assert.equal(overload.kind, 'options');
if (overload.kind === 'options') {
  const ids = overload.options.map(o => o.id);
  assert(ids.includes('keep'), 'Changing nothing is always an option');
  assert(ids.length >= 3, 'The demo week offers a real choice, not only yes or no');
  const m = overload.options.map(o => optionMetrics(state, o, overload.conflict));
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m.length; j++) {
    if (i === j || ids[j] === 'keep' || ids[i] === 'keep') continue;
    const beaten = m[j].bufferMinutes >= m[i].bufferMinutes && m[j].moved <= m[i].moved && m[j].freeDays >= m[i].freeDays
      && m[j].conflictsLeft <= m[i].conflictsLeft && JSON.stringify(m[j]) !== JSON.stringify(m[i]);
    assert(!beaten, `${ids[i]} is not beaten on every measure by ${ids[j]}`);
  }
  for (const o of overload.options.filter(o => o.id !== 'keep')) {
    assert.deepEqual(validatePlan(state, o.tasks, o.commitments, o.blocks), [], `${o.title} is a valid plan`);
  }
  const gym = overload.options.find(o => o.movedId === 'gym');
  assert(gym, 'Moving the gym is offered because it genuinely frees days');
  assert.equal(reducer(state, { type: 'approve', plan: gym! }).commitments.find(c => c.id === 'gym')?.date, '2026-09-13');
}
assert(respond(state, overload).message.chips?.some(c => c.action === 'calendar'), 'The comparison opens only when the student asks');

// the combined sentence from the spec: the existing task is recognised, not duplicated
const combo = go(state, 'I need to finish my database assignment by Friday, probably 3 hours, and I have work Friday from 6pm to 10pm.');
assert.equal(combo.ready?.task, undefined, 'An existing task is not added twice');
assert.equal(combo.ready?.commitment?.title, 'Work');

// a fixed commitment in the way: ask for another time
const clash = planRequest(state, go(state, 'Class Monday 9am to 10am').ready!);
assert.equal(clash.kind, 'clash');
assert.equal(respond(state, clash).draft.awaiting, 'time');

// nothing fits: an honest shortfall, and a smaller estimate is asked for
const huge = planRequest(state, go(state, 'Thesis chapter due Tuesday, 10 hours').ready!);
assert.equal(huge.kind, 'none');
assert.equal(respond(state, huge).draft.awaiting, 'effort');

// small talk never becomes a task
assert.equal(converse(state, {}, 'hi').ready, undefined);
assert.equal(converse(state, {}, 'hi').draft.awaiting, undefined);

// ---- the two demo examples must not spoil each other, in either order ----
const LAB = 'Lab report due Friday, about 1 hour';
const WORK = 'I have work Friday from 6pm to 10pm';
const ask = (s: typeof state, text: string) => planRequest(s, go(s, text).ready!);
const labFirst = ask(state, LAB);
assert.equal(labFirst.kind, 'fits');
if (labFirst.kind === 'fits') {
  assert.deepEqual(labFirst.options.map(o => o.id), ['fits', 'fits-spread'], 'Free time can be used all at once or a little each day');
  const [early, spread] = labFirst.options.map(o => optionMetrics(state, o));
  assert(early.bufferMinutes > spread.bufferMinutes && early.longestSitting > spread.longestSitting, 'A real trade-off: finish sooner, or shorter sittings');
  assert(labFirst.options.every(untouched));
}
const afterLab = labFirst.kind === 'fits' ? reducer(state, { type: 'approve', plan: labFirst.plan }) : state;
const workAfterLab = ask(afterLab, WORK);
assert(workAfterLab.kind === 'options' && workAfterLab.options.length === 3, 'Lab first still leaves a three-way choice for the shift');
const workFirst = ask(state, WORK);
assert(workFirst.kind === 'options');
if (workFirst.kind === 'options') {
  for (const choice of workFirst.options.filter(o => o.id !== 'keep')) {
    assert.equal(ask(reducer(state, { type: 'approve', plan: choice }), LAB).kind, 'fits', `After "${choice.title}" the lab report still fits`);
  }
}

console.log('Flow: parse → ask → fits cleanly | honest options on overload | clash | shortfall passed.');
