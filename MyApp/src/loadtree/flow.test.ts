/// <reference types="node" />
import assert from 'node:assert';
// Parsing and planning mechanics use the classic week; the hackathon story uses Alex's real fortnight.
import { makeClassicDemo as makeDemo, makeDemo as makeAlexWeeks } from './demo';
import { buildTask, cleanTitle, converse, deadlineFrom, estimateFor, minutesFrom, readRange, respond } from './chat';
import { appliedSummary, planRequest } from './flow';
import { optionMetrics } from './conflict';
import { validatePlan } from './planner';
import { reducer } from './state';
import { Candidate, planState, remaining, stamp } from './model';
import { slotKey } from './planChanges';
import { choicesFor, fitSummary, impactOf } from './impact';

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
assert(labAsk.messages.some(m => m.review?.task), 'The breakdown arrives as an editable item, not a paragraph');
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
assert.equal(turn.draft.awaiting, 'confirm', 'Known kinds of work are sized by LoadTree, not by asking the student');
turn = converse(state, turn.draft, 'yes');
assert.equal(turn.ready?.task?.deadline, '2026-09-10T23:59');
assert.equal(remaining(turn.ready!.task!), 240, 'A midterm is planned at its realistic size');
// Work LoadTree cannot size on its own is the only time the student is asked for hours.
let unknown = converse(state, {}, 'Club poster due Thursday');
assert.equal(unknown.draft.awaiting, 'effort');
unknown = converse(state, unknown.draft, '2 hours');
assert.equal(remaining(unknown.draft.proposal!.task!), 120);
// The underestimate the app exists to catch: a low guess is planned at the realistic size, and said so.
const lowball = converse(state, {}, 'Lab report due Thursday, about 1 hour');
assert.equal(remaining(lowball.draft.proposal!.task!), 180);
assert(lowball.messages.some(m => /You said about 1h/.test(m.text)), 'The student is told why the plan is bigger than their guess');
assert.equal(remaining(converse(state, lowball.draft, '1 hour').draft.proposal!.task!), 60, 'A deliberate correction is respected');
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

// ---- brain-dump: one sentence, two structured items, the task already broken down ----
const dump = converse(state, {}, 'Lab report Friday about 3 hours, and work Friday 6pm to 10pm');
const items = dump.messages.find(m => m.review)?.review;
assert.equal(dump.draft.awaiting, 'confirm', 'Both items are shown for review before anything is planned');
assert.equal(items?.task?.title, 'Lab report', 'The day word does not leak into the title');
assert.equal(items?.task?.deadline, '2026-09-11T23:59', '"Lab report Friday" means due Friday');
assert.equal(remaining(items!.task!), 180);
assert.deepEqual(items!.task!.steps.map(s => s.remaining), [30, 60, 60, 30]);
assert.deepEqual([items?.commitment?.title, items?.commitment?.date, items?.commitment?.start, items?.commitment?.end], ['Work', '2026-09-11', 1080, 1320]);
const unticked = converse(state, { ...dump.draft, skip: [items!.task!.steps[0].id] }, 'Looks right');
assert.equal(remaining(unticked.ready!.task!), 150, 'An unticked subtask is left out of the plan');
assert.equal(planRequest(state, converse(state, dump.draft, 'Looks right').ready!).kind, 'options', 'Together they overload Friday, so choices are offered');
// ---- the fit check and the plan cards, from the same brain-dump ----
const dumpOutcome = planRequest(state, converse(state, dump.draft, 'Looks right').ready!);
assert(dumpOutcome.kind === 'options');
if (dumpOutcome.kind === 'options') {
  const fit = fitSummary(state, dumpOutcome);
  assert.equal(fit.needed, 330, 'Needed: the 3h lab report plus the 2h 30m of study the shift pushes off');
  assert.equal(fit.short, Math.max(0, fit.needed - fit.available), 'Short is exactly what is needed minus what is free');
  assert(fit.short > 0, 'The demo week is genuinely over capacity');
  const cards = choicesFor(state, dumpOutcome);
  assert.equal(cards[cards.length - 1].id, 'keep', 'The last card is the week as it is, to compare the fixes against');
  assert.equal(impactOf(state, cards[cards.length - 1], dumpOutcome.conflict, dumpOutcome.request)[0].value, 'At risk', 'Keeping things as they are is honest about the cost');
  const shorter = cards.find(c => c.id === 'shorten');
  assert(shorter, 'A shorter shift is offered because it makes the week work');
  const work = shorter!.commitments.find(c => c.id === dumpOutcome.request.commitment!.id)!;
  assert(work.end - work.start < 240 && work.end - work.start >= 120, 'The shift is cut, but never by more than half');
  assert(shorter!.commitments.every(c => { const b = state.commitments.find(o => o.id === c.id); return !b || (b.date === c.date && b.start === c.start); }), 'Nothing else moves');
  assert.deepEqual(validatePlan(state, shorter!.tasks, shorter!.commitments, shorter!.blocks), []);
  for (const card of cards.filter(c => c.id !== 'keep')) assert.equal(impactOf(state, card, dumpOutcome.conflict)[0].value, 'Covered', `${card.id} covers the deadline`);
}

// "Add more items": a second message joins the first instead of replacing it
const more = converse(state, converse(state, {}, 'Lab report Friday about 3 hours').draft, 'work Friday 6pm to 10pm');
const merged = more.messages.find(m => m.review)?.review;
assert(merged?.task && merged.commitment, 'Added items join the ones already under review');

// ---- a long-term project in Alex's real fortnight: questions first, then a breakdown paced over two weeks ----
const alex = makeAlexWeeks(true);
assert.deepEqual(validatePlan(alex, alex.tasks, alex.commitments, alex.blocks), [], 'Alex’s opening fortnight is a valid plan');
assert.equal(alex.tasks.reduce((sum, t) => sum + remaining(t), 0), alex.blocks.reduce((sum, b) => sum + b.end - b.start, 0), 'All of Alex’s existing coursework is already scheduled');
assert(alex.commitments.some(c => c.title === 'Debate competition'), 'The debate competition is on the calendar');
let hack = converse(alex, {}, 'I’m joining a hackathon and the submission is due in two weeks');
assert.equal(hack.draft.deadline, '2026-09-21T23:59', '"In two weeks" is two weeks from today');
assert.equal(hack.draft.awaiting, 'team', 'A long project asks follow-up questions before breaking it down');
hack = converse(alex, hack.draft, 'With a team');
assert.equal(hack.draft.awaiting, 'stage');
hack = converse(alex, hack.draft, 'I have an idea');
assert.equal(hack.draft.awaiting, 'scope', 'LoadTree asks about the scope, not for an hours guess');
hack = converse(alex, hack.draft, 'A simple demo');
const project = hack.messages.find(m => m.review)?.review?.task!;
assert.equal(remaining(project), estimateFor('Hackathon project', { team: 'team', stage: 'idea', scope: 'simple' }), 'The hours are LoadTree’s estimate');
assert(hack.messages.some(m => /I estimate about/.test(m.text)), 'The estimate is stated, with its weekly pace');
assert(project.steps.some(s => /Split roles/.test(s.title)), 'A team gets a step to split roles');
assert(!project.steps.some(s => /problem & idea/.test(s.title)), 'An idea already in hand is not planned again');
assert(project.steps.some(s => s.optional), 'Optional scope is marked, so it can be cut later');
// Even the smallest version is more than the fortnight has free — so the student is always shown a choice.
const paced = planRequest(alex, converse(alex, hack.draft, 'Looks right').ready!);
assert.equal(paced.kind, 'options', 'A hackathon overloads a normal fortnight');
if (paced.kind === 'options') {
  const cards = choicesFor(alex, paced);
  assert(cards.length >= 2, 'There is always more than one way to make room');
  assert(cards.some(c => c.id === 'extra-weekend' || c.id === 'longer-days'), 'Finding more time is one of them');
  for (const c of cards) assert.deepEqual(validatePlan(planState(alex, c), c.tasks, c.commitments, c.blocks), [], `${c.title} is a valid plan`);
  const withTime = cards.find(c => c.preferences)!;
  const applied = reducer(alex, { type: 'approve', plan: withTime });
  assert.notEqual(applied, alex, 'A plan that finds more time can be applied');
  assert.deepEqual(applied.preferences, withTime.preferences, 'Applying it saves the new routine');
  assert(new Set(withTime.blocks.filter(b => b.taskId === project.id).map(b => b.date)).size >= 5, 'The work is spread across the fortnight');
}
// Too much for the fortnight: cutting optional scope is offered as a real choice.
let tight = converse(alex, {}, 'I’m joining a hackathon and the submission is due in two weeks');
for (const answer of ['Solo', 'Starting from scratch', 'A working prototype']) tight = converse(alex, tight.draft, answer);
assert.equal(remaining(tight.draft.proposal!.task!), 1320, 'A solo prototype from scratch is about 22h of work');
// A far-too-low guess for a hackathon is caught too.
assert(estimateFor('Hackathon project')! > 600, 'A hackathon is never planned as a ten-hour job by default');
const squeezed = planRequest(alex, converse(alex, tight.draft, 'Looks right').ready!);
assert.equal(squeezed.kind, 'options');
if (squeezed.kind === 'options') {
  assert(squeezed.options.some(o => o.preferences), 'Weekends or longer days can find the time');
  for (const o of squeezed.options.filter(o => o.id !== 'keep')) assert.deepEqual(validatePlan(planState(alex, o), o.tasks, o.commitments, o.blocks), [], `${o.title} is a valid plan`);
}
// Every way the questions can be answered ends in a choice, never a quiet fit or a dead end.
for (const team of ['Solo', 'With a team']) for (const stage of ['Starting from scratch', 'I have an idea', 'Already building']) for (const scope of ['A simple demo', 'A working prototype', 'A polished full app']) {
  let t = converse(alex, {}, 'I’m joining a hackathon and the submission is due in two weeks');
  for (const answer of [team, stage, scope]) t = converse(alex, t.draft, answer);
  const o = planRequest(alex, converse(alex, t.draft, 'Looks right').ready!);
  const cards = o.kind === 'options' ? choicesFor(alex, o) : [];
  assert(cards.filter(c => c.id !== 'keep').length >= 1 && cards.some(c => c.id === 'keep'), `${team} · ${stage} · ${scope} overloads, and offers a real fix plus keeping things as they are`);
}

// small talk never becomes a task
assert.equal(converse(state, {}, 'hi').ready, undefined);
assert.equal(converse(state, {}, 'hi').draft.awaiting, undefined);

// ---- the two demo examples must not spoil each other, in either order ----
// Work LoadTree cannot size itself, so the student's 1 hour stands (a lab report would be planned at 3h).
const LAB = 'Club poster due Friday, about 1 hour';
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
