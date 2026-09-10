import { AppState, Block, Candidate, Commitment, Dimension, Task, WEEK, dateLabel, duration, overlaps, remaining, stamp, time } from './model';
import { planWork } from './planner';

/** Everything a messy sentence can tell us. Any field may be missing. */
export interface Parsed {
  commitment?: Commitment;
  taskTitle?: string;
  minutes?: number;
  deadline?: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const NOUNS: { match: RegExp; title: string; dimension: Dimension; kind: Commitment['kind'] }[] = [
  { match: /\bwork\b|\bshift\b/i, title: 'Work', dimension: 'physical', kind: 'fixed' },
  { match: /\bgym\b|\btraining\b|\bpractice\b/i, title: 'Gym session', dimension: 'physical', kind: 'flexible' },
  { match: /\bclass\b|\blecture\b|\blab\b|\btutorial\b/i, title: 'Class', dimension: 'mental', kind: 'fixed' },
  { match: /\bmeeting\b|\bstandup\b/i, title: 'Meeting', dimension: 'mental', kind: 'fixed' },
  { match: /\bdinner\b|\blunch\b|\bparty\b|\bcatch ?up\b/i, title: 'Social plan', dimension: 'social', kind: 'fixed' },
  { match: /\bappointment\b|\bdoctor\b|\bdentist\b/i, title: 'Appointment', dimension: 'errands', kind: 'fixed' },
];

const dayIndex = (text: string) => DAYS.findIndex(d => new RegExp(`\\b${d}\\b`, 'i').test(text));

/** "6pm", "6:30 pm", "18:00" -> minutes past midnight. */
function readClock(raw: string, meridiem?: string): number | null {
  const parts = raw.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!parts) return null;
  let hour = Number(parts[1]);
  const mins = Number(parts[2] ?? 0);
  if (hour > 23 || mins > 59) return null;
  const suffix = meridiem?.toLowerCase();
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  return hour * 60 + mins;
}

function readTimes(text: string): number[] {
  const found: number[] = [];
  const pattern = /(\d{1,2}(?::\d{2})?)\s*(am|pm)?/gi;
  let hit: RegExpExecArray | null;
  while ((hit = pattern.exec(text))) {
    // A bare number with no meridiem is far more likely to be "3 hours" than a clock time.
    if (!hit[2] && !hit[1].includes(':')) continue;
    const minutes = readClock(hit[1], hit[2]);
    if (minutes !== null) found.push(minutes);
  }
  return found;
}

export function parseInput(text: string, state: AppState): Parsed {
  const out: Parsed = {};
  const day = dayIndex(text);
  const times = readTimes(text);

  if (day >= 0 && times.length >= 2) {
    let [start, end] = times;
    if (end <= start && end + 720 <= 1440) end += 720; // "6 to 10" after a pm start
    if (end > start) {
      const noun = NOUNS.find(n => n.match.test(text));
      out.commitment = {
        id: `event-${Date.now()}`,
        title: noun?.title ?? 'New commitment',
        date: WEEK[day],
        start: Math.round(start / 15) * 15,
        end: Math.min(1440, Math.round(end / 15) * 15),
        kind: noun?.kind ?? 'fixed',
        dimension: noun?.dimension ?? 'errands',
        demand: 'medium',
      };
    }
  }

  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:h\b|hrs?\b|hours?\b)/i);
  if (hours) out.minutes = Math.max(15, Math.round((parseFloat(hours[1]) * 60) / 15) * 15);

  const named = text.match(/\b(?:my|the)\s+([a-z][a-z ]{2,32}?)\s+(?:assignment|report|essay|project|coursework)\b/i);
  if (named) out.taskTitle = `${named[1].trim()} assignment`;
  if (day >= 0 && /\b(?:by|due|before)\b/i.test(text)) out.deadline = `${WEEK[day]}T23:59`;
  return out;
}

export interface Conflict {
  commitment: Commitment;
  /** Scheduled work the new commitment would sit on top of. */
  displaced: Block[];
  displacedMinutes: number;
  task?: Task;
  clashingCommitment?: Commitment;
}

/** What breaks if this commitment is added, without changing anything yet. */
export function findConflict(state: AppState, commitment: Commitment): Conflict {
  const clashingCommitment = state.commitments.find(c => overlaps(c, commitment));
  const displaced = state.blocks.filter(b => overlaps(b, commitment) && stamp(b) >= state.now);
  const task = displaced.length ? state.tasks.find(t => t.id === displaced[0].taskId) : undefined;
  return {
    commitment,
    displaced,
    displacedMinutes: displaced.reduce((sum, b) => sum + b.end - b.start, 0),
    task,
    clashingCommitment,
  };
}

export const conflictHeadline = (conflict: Conflict) =>
  conflict.clashingCommitment
    ? `This overlaps ${conflict.clashingCommitment.title}, which cannot move.`
    : conflict.task
    ? `${conflict.task.title} no longer fits comfortably.`
    : 'Nothing else is scheduled then.';

/**
 * Options for accepting the new commitment. The planner does the real work; the
 * last option is the honest "change nothing" case, which the planner cannot
 * produce because it only returns schedules that fit.
 */
export function conflictOptions(state: AppState, conflict: Conflict): Candidate[] {
  const withEvent: AppState = { ...state, commitments: [...state.commitments, conflict.commitment] };
  // The displaced work goes back in the pool for re-planning.
  const freed: AppState = { ...withEvent, blocks: state.blocks.filter(b => !conflict.displaced.some(d => d.id === b.id)) };
  const active = freed.tasks.filter(t => remaining(t) > 0);
  const planned = active.length ? planWork(freed, freed.tasks).candidates : [];

  const keep: Candidate = {
    id: 'keep',
    title: 'Change nothing',
    description: `Leave the week exactly as it is. ${conflict.commitment.title} is not added.`,
    tradeOff: `${conflict.commitment.title} does not go in the calendar.`,
    benefits: ['Your current schedule is untouched', conflict.task ? `${conflict.task.title} keeps its slot` : 'Nothing to rearrange'],
    costs: [`${conflict.commitment.title} on ${dateLabel(conflict.commitment.date)} does not fit`],
    commitments: state.commitments,
    blocks: state.blocks,
    tasks: state.tasks,
    sourceRevision: state.revision,
  };

  const shaped = planned.slice(0, 2).map((plan, i): Candidate => ({
    ...plan,
    title: plan.movedId ? plan.title : 'Move the work earlier',
    benefits: [`${conflict.commitment.title} goes in as asked`, ...plan.benefits],
    costs: plan.costs,
  }));

  if (!shaped.length && conflict.task) {
    shaped.push({
      ...keep,
      id: 'squeeze',
      title: `Add ${conflict.commitment.title} anyway`,
      description: `${conflict.commitment.title} goes in, but ${duration(conflict.displacedMinutes)} of ${conflict.task.title} has nowhere to go.`,
      tradeOff: `${duration(conflict.displacedMinutes)} would be left unscheduled.`,
      benefits: [`${conflict.commitment.title} goes in as asked`],
      costs: [`${duration(conflict.displacedMinutes)} of ${conflict.task.title} left unscheduled`, 'You would need to renegotiate the deadline'],
      commitments: withEvent.commitments,
      blocks: freed.blocks,
    });
  }
  return [...shaped, keep];
}

export const changeSummary = (before: Block | Commitment, after: Block | Commitment) =>
  `${dateLabel(before.date)} ${time(before.start)}–${time(before.end)} → ${dateLabel(after.date)} ${time(after.start)}–${time(after.end)}`;
