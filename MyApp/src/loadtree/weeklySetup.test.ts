import assert from 'node:assert';
import { makeDemo, emptyWeek } from './demo';
import { reducer, setupErrors } from './state';
import { WEEK, daysLabel } from './model';
import { planWork } from './planner';
import { commitmentsFor } from './routines';

// 1. emptyWeek baseline setup with 3 core time blocks
const empty = emptyWeek();
assert.equal(empty.setupDone, false, 'emptyWeek starts with setupDone false');
assert(empty.preferences.availability.length > 0, 'emptyWeek pre-populates study availability');
assert.equal(empty.preferences.availability[0].start, 480, 'Study starts at 8:00 AM');
assert.equal(empty.preferences.availability[0].end, 960, 'Study ends at 4:00 PM');
assert(empty.commitments.some(c => c.title.toLowerCase().includes('free')), 'emptyWeek pre-populates free time (6-10pm)');
assert(empty.commitments.some(c => c.title.toLowerCase().includes('sleep')), 'emptyWeek pre-populates protected sleep (10pm-12am)');
assert.equal(empty.preferences.dailyLimit, 240, 'emptyWeek pre-populates 4h daily limit');

// When user enters their name, baseline passes validation
const namedBaseline = { ...empty.preferences, name: 'Student' };
const baselineErrors = setupErrors(namedBaseline, empty.commitments);
assert.equal(baselineErrors.length, 0, `Baseline with name should have 0 errors, got: ${baselineErrors.join(', ')}`);

// 2. Saving setup preserves existing blocks and manual tasks
const demo = makeDemo(true);
assert(demo.blocks.length > 0, 'Demo has blocks');
const originalBlocksCount = demo.blocks.length;

const updatedPreferences = {
  ...demo.preferences,
  dailyLimit: 180,
};
const nextState = reducer(demo, {
  type: 'setup',
  preferences: updatedPreferences,
  commitments: demo.commitments,
});

assert.equal(nextState.blocks.length, originalBlocksCount, 'Saving weekly setup preserves existing scheduled blocks');
assert.equal(nextState.preferences.dailyLimit, 180, 'Preferences updated successfully');
assert.equal(nextState.setupDone, true, 'setupDone is true after setup');

// 3. Manual event in recovery window does not cause an overlap error
const lateNightEvent = {
  id: 'late-night-study',
  title: 'Midnight Hack',
  date: WEEK[0],
  start: 1350, // 22:30 (during 22:00-24:00 sleep)
  end: 1410,   // 23:30
  kind: 'fixed' as const,
  dimension: 'mental' as const,
  demand: 'medium' as const,
};
const commitmentsWithManualLateEvent = [...demo.commitments, lateNightEvent];
const errorsWithManualLateEvent = setupErrors(demo.preferences, commitmentsWithManualLateEvent);
assert(
  !errorsWithManualLateEvent.includes('Two commitments overlap. Adjust their times.'),
  'Manual event during recovery window should not trigger overlap error'
);

// 4. Two non-recovery events overlapping STILL triggers an overlap error
const clashingLecture = {
  id: 'lecture-clash',
  title: 'Clashing Lecture',
  date: WEEK[0],
  start: 540,
  end: 660,
  kind: 'fixed' as const,
  dimension: 'mental' as const,
  demand: 'high' as const,
};
const errorsWithClash = setupErrors(demo.preferences, [...demo.commitments, clashingLecture]);
assert(
  errorsWithClash.includes('Two commitments overlap. Adjust their times.'),
  'Two non-recovery commitments overlapping must trigger overlap error'
);

// 5. Rescheduling rule: flexible events moving into study windows are rejected
const stateWithFlexibleInStudy = {
  ...demo,
  preferences: {
    ...demo.preferences,
    availability: [{ date: WEEK[5], start: 600, end: 720 }], // Saturday 10am-12pm is study time
  },
  commitments: [
    ...demo.commitments,
    {
      id: 'gym-flex',
      title: 'Gym Session',
      date: WEEK[1],
      start: 720,
      end: 780,
      kind: 'flexible' as const,
      dimension: 'physical' as const,
      demand: 'medium' as const,
      moveWindows: [{ date: WEEK[5], start: 600, end: 660 }], // tries to move into Saturday study time!
    },
  ],
};
const planResult = planWork(stateWithFlexibleInStudy);
// Candidates should not contain move to Saturday 10am because it overlaps study time!
const illegalMoveCandidate = planResult.candidates.find(c =>
  c.commitments.some(comm => comm.id === 'gym-flex' && comm.date === WEEK[5] && comm.start === 600)
);
assert.equal(illegalMoveCandidate, undefined, 'Rescheduling must not move flexible activity into study time');

// 6. RoutineEditor daysLabel
assert.equal(daysLabel([...WEEK]), 'Every day');
assert.equal(daysLabel(WEEK.slice(0, 5)), 'Weekdays');
assert.equal(daysLabel(WEEK.slice(5, 7)), 'Weekends');

// 7. Overnight Sleep / Time Block support
const overnightRoutine = {
  name: 'Protected sleep',
  start: 1380, // 23:00 (11:00 PM)
  end: 420,    // 07:00 (7:00 AM next day)
  days: [WEEK[0]], // Monday night
  kind: 'recovery' as const,
  dimension: 'physical' as const,
};
const overnightCommitments = commitmentsFor([], overnightRoutine);
assert.equal(overnightCommitments.length, 2, 'Overnight routine generates 2 segments (evening + morning next day)');
const eve = overnightCommitments.find(c => c.date === WEEK[0])!;
const morn = overnightCommitments.find(c => c.date === WEEK[1])!;
assert(eve && morn, 'Overnight routine creates evening on Mon and morning on Tue');
assert.equal(eve.start, 1380, 'Evening segment starts at 23:00');
assert.equal(eve.end, 1440, 'Evening segment ends at 24:00 (midnight)');
assert.equal(morn.start, 0, 'Morning segment starts at 00:00 (midnight)');
assert.equal(morn.end, 420, 'Morning segment ends at 07:00 (7:00 AM)');

// Total sleep duration across midnight is 1h + 7h = 8h (480 mins)
const totalDuration = (eve.end - eve.start) + (morn.end - morn.start);
assert.equal(totalDuration, 480, 'Total overnight sleep duration equals 8 hours');

// Overnight segments pass setupErrors validation with 0 errors
const errorsWithOvernight = setupErrors({ ...empty.preferences, name: 'Alex' }, overnightCommitments);
assert.equal(errorsWithOvernight.length, 0, 'Overnight commitments satisfy state invariants with 0 errors');

// 8. Mock Template Verification & Overlap Detection
// In emptyWeek():
// Study: 8:00 - 16:00 (480 - 960) Mon-Fri
// Free: 18:00 - 20:00 (1080 - 1200) Mon-Sun
// Sleep: 23:00 - 07:00 (1380 - 1440 & 0 - 420) Mon-Sun
const allTemplateBlocks = [
  ...empty.preferences.availability.map(w => ({ ...w, label: 'Study' })),
  ...empty.commitments.filter(c => c.kind === 'recovery').map(c => ({ ...c, label: c.title })),
];
let templateOverlapFound = false;
for (let i = 0; i < allTemplateBlocks.length; i++) {
  for (let j = i + 1; j < allTemplateBlocks.length; j++) {
    const b1 = allTemplateBlocks[i];
    const b2 = allTemplateBlocks[j];
    if (b1.date === b2.date && Math.max(b1.start, b2.start) < Math.min(b1.end, b2.end)) {
      templateOverlapFound = true;
      break;
    }
  }
}
assert.equal(templateOverlapFound, false, 'Template time blocks (Study 8-4, Free 6-8, Sleep 11-7) have zero overlaps');

// An overlapping block is detected
const conflictingStudy = { date: WEEK[0], start: 1100, end: 1250 }; // overlaps Free Time (1080-1200)
const hasClashWithFree = empty.commitments.some(
  c => c.date === conflictingStudy.date && Math.max(c.start, conflictingStudy.start) < Math.min(c.end, conflictingStudy.end)
);
assert.equal(hasClashWithFree, true, 'Conflicting block with Free time is accurately detected as an overlap');

console.log('Weekly Setup: 3 core time blocks, overnight sleep, overlap protection, and template passed.');
