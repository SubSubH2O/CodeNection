import { AppState, Block, Candidate, Commitment, addDays, dateLabel, duration, remaining, stamp, weekdayOf } from './model';
import { Conflict, optionMetrics } from './conflict';
import { Outcome, Request, freeStudyMinutes, shortenedShift } from './flow';
import { planChanges } from './planChanges';

/** Everything the fit check and the plan cards say is computed here from the real plans. */
export type Options = Extract<Outcome, { kind: 'options' }>;

export const weekdayName = (date: string, short = false) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: short ? 'short' : 'long' });
const hour12 = (m: number) => { const h = Math.floor(m / 60) % 24; const mm = m % 60; return `${((h + 11) % 12) + 1}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`; };
const half = (m: number) => (Math.floor(m / 60) % 24 < 12 ? 'AM' : 'PM');
/** "6–10 PM", or "11 AM – 2 PM" when the range crosses noon. */
export const span12 = (start: number, end: number) => (half(start) === half(end) ? `${hour12(start)}–${hour12(end)} ${half(end)}` : `${hour12(start)} ${half(start)} – ${hour12(end)} ${half(end)}`);
const eventName = (c: Commitment) => (c.title === 'Work' ? 'Work shift' : c.title);

/** The plans worth showing as cards: never "change nothing", plus a shorter shift when one would work. */
export function choicesFor(state: AppState, outcome: Options): Candidate[] {
  const plans = outcome.options.filter(o => o.id !== 'keep');
  const shorter = shortenedShift(state, outcome.request);
  return shorter ? [...plans.slice(0, 2), shorter] : plans.slice(0, 3);
}

// ---------- the fit check ----------

export interface FitSummary { day: string; deadline: string; needed: number; available: number; short: number; displaced: number; neededFor: string }

/** Time needed (the new task plus any study the new commitment pushes off) against free time before the deadline. */
export function fitSummary(state: AppState, outcome: Options): FitSummary {
  const { request, conflict } = outcome;
  const displaced = conflict?.displacedMinutes ?? 0;
  const needed = (request.task ? remaining(request.task) : 0) + displaced;
  const deadline = [request.task?.deadline, conflict?.task?.deadline].filter((d): d is string => !!d).sort().pop() ?? `${state.now.slice(0, 10)}T23:59`;
  const base: AppState = {
    ...state,
    commitments: request.commitment ? [...state.commitments, request.commitment] : state.commitments,
    blocks: state.blocks.filter(b => !conflict?.displaced.some(d => d.id === b.id)),
  };
  const available = freeStudyMinutes(base, deadline);
  const neededFor = [request.task?.title, displaced ? 'moved study' : ''].filter(Boolean).join(' + ');
  return { day: request.commitment?.date ?? deadline.slice(0, 10), deadline, needed, available, short: Math.max(0, needed - available), displaced, neededFor };
}

/** For long projects: free study time in each week before the deadline, as the plan stands. */
export function freeByWeek(state: AppState, outcome: Options, fit: FitSummary): { label: string; minutes: number }[] {
  const { request, conflict } = outcome;
  const base: AppState = {
    ...state,
    commitments: request.commitment ? [...state.commitments, request.commitment] : state.commitments,
    blocks: state.blocks.filter(b => !conflict?.displaced.some(d => d.id === b.id)),
  };
  const rows: { label: string; minutes: number }[] = [];
  let start = state.now.slice(0, 10);
  let before = 0;
  while (start <= fit.deadline.slice(0, 10)) {
    const sunday = addDays(start, 6 - weekdayOf(start));
    const until = `${sunday}T23:59` < fit.deadline ? `${sunday}T23:59` : fit.deadline;
    const total = freeStudyMinutes(base, until);
    rows.push({ label: `Week of ${dateLabel(start)}`, minutes: total - before });
    before = total;
    start = addDays(sunday, 1);
  }
  return rows;
}

export interface DayItem { key: string; title: string; when: string; note: string; kind: 'commitment' | 'study' | 'new' | 'clash' }

/** That day as it would be if the new items were simply added: what is there, what is new, what clashes. */
export function dayItems(state: AppState, outcome: Options, day: string): DayItem[] {
  const { request, conflict } = outcome;
  const rows: (DayItem & { start: number })[] = [];
  for (const c of state.commitments) {
    if (c.date === day && c.kind !== 'recovery') rows.push({ key: c.id, title: c.title, when: span12(c.start, c.end), note: c.kind === 'fixed' ? 'Fixed' : 'Flexible', kind: 'commitment', start: c.start });
  }
  let run: Block[] = [];
  const flush = () => {
    if (!run.length) return;
    const first = run[0]; const last = run[run.length - 1];
    const clash = run.some(b => conflict?.displaced.some(d => d.id === b.id));
    const owner = state.tasks.find(t => t.id === first.taskId);
    rows.push({ key: first.id, title: owner?.title ?? first.title, when: span12(first.start, last.end), note: clash && conflict ? `Study · clashes with ${eventName(conflict.commitment).toLowerCase()}` : 'Study', kind: clash ? 'clash' : 'study', start: first.start });
    run = [];
  };
  for (const b of state.blocks.filter(b => b.date === day && stamp(b) >= state.now).sort((a, b) => a.start - b.start)) {
    const prev = run[run.length - 1];
    if (prev && (prev.taskId !== b.taskId || prev.end !== b.start)) flush();
    run.push(b);
  }
  flush();
  const c = request.commitment;
  if (c && c.date === day) rows.push({ key: 'new-event', title: eventName(c), when: span12(c.start, c.end), note: `New · ${c.kind === 'flexible' ? 'Flexible' : 'Fixed'}`, kind: 'new', start: c.start });
  rows.sort((a, b) => a.start - b.start);
  const task = request.task;
  if (task) rows.push({ key: 'new-task', title: `${task.title} (${duration(remaining(task))})`, when: 'Needs time', note: `New · due ${weekdayName(task.deadline.slice(0, 10), true)}`, kind: 'new', start: Infinity });
  return rows;
}

/** What keeping everything, moving nothing, would cost. */
export function keepRows(outcome: Options, fit: FitSummary): { label: string; sub: string; value: string; bad: boolean }[] {
  const c = outcome.request.commitment;
  return [
    { label: 'Deadline', sub: fit.short ? `${duration(fit.short)} of work has no slot` : 'Only if other study moves', value: fit.short ? 'At risk' : 'Tight', bad: true },
    { label: 'Clashes', sub: fit.displaced && c ? `${eventName(c)} sits on ${duration(fit.displaced)} of study` : 'Nothing overlaps', value: fit.displaced ? duration(fit.displaced) : 'None', bad: fit.displaced > 0 },
    { label: 'Time to spare', sub: 'No room if anything runs late', value: fit.short ? '0h' : duration(Math.max(0, fit.available - fit.needed)), bad: fit.short > 0 },
  ];
}

// ---------- the plan cards ----------

export interface Impact { label: string; icon: string; value: string; good: boolean }
const spare = (m: number) => (m <= 0 ? 'None' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`);

/** Rest a plan takes away: a moved workout, study on the weekend, or longer study days. */
function recoveryOf(state: AppState, option: Candidate, moved?: Commitment): { value: string; good: boolean } {
  if (moved) return { value: `Moved to ${weekdayName(moved.date, true)}`, good: false };
  const prefs = option.preferences;
  if (prefs && prefs.availability.some(w => weekdayOf(w.date) >= 5 && !state.preferences.availability.some(a => a.date === w.date && a.start === w.start))) return { value: 'Less weekend rest', good: false };
  if (prefs && prefs.dailyLimit > state.preferences.dailyLimit) return { value: 'Longer days', good: false };
  return { value: 'Protected', good: true };
}

/** The four things a student weighs: the deadline, sleep, rest, and slack. */
export function impactOf(state: AppState, option: Candidate, conflict?: Conflict): Impact[] {
  const m = optionMetrics(state, option, conflict);
  const rest = option.commitments.find(c => {
    const before = state.commitments.find(o => o.id === c.id);
    return before && (before.date !== c.date || before.start !== c.start) && (c.dimension === 'physical' || c.kind === 'recovery');
  });
  return [
    { label: 'Deadline', icon: 'doc', value: m.conflictsLeft ? 'At risk' : 'Covered', good: !m.conflictsLeft },
    { label: 'Sleep', icon: 'bed', value: m.protectedKept ? 'Protected' : 'Cut short', good: m.protectedKept },
    { label: 'Recovery time', icon: 'clock', ...recoveryOf(state, option, rest) },
    { label: 'Time to spare', icon: 'bars', value: spare(m.bufferMinutes), good: m.bufferMinutes >= 720 },
  ];
}

/** A plan's name and one-line story, from what it actually changes. */
export function describe(state: AppState, option: Candidate, request: Request): { title: string; desc: string; tag?: string } {
  const c = request.commitment;
  if (option.id === 'shorten' && c) {
    const now = option.commitments.find(x => x.id === c.id) ?? c;
    return { title: 'Shorten the shift', desc: `Work ${span12(now.start, now.end)} instead of ${span12(c.start, c.end)}. No other commitments move.`, tag: 'Needs your manager’s OK' };
  }
  if (option.preferences && request.task) {
    // Finding more time: say where it comes from and what it costs.
    const fresh = option.blocks.filter(b => b.taskId === request.task!.id);
    const weekend = fresh.filter(b => weekdayOf(b.date) >= 5).reduce((sum, b) => sum + b.end - b.start, 0);
    const before = state.preferences.dailyLimit; const after = option.preferences.dailyLimit;
    const limit = after > before ? ` Your daily study limit rises from ${duration(before)} to ${duration(after)}.` : '';
    return option.id === 'extra-weekend'
      ? { title: option.title, desc: `About ${duration(weekend)} of the work moves to Saturdays and Sundays.${limit}`, tag: 'Less weekend rest' }
      : { title: option.title, desc: `Study every weekday evening until 9 PM.${limit}`, tag: 'Longer days' };
  }
  if (option.id.startsWith('trim') && request.task) {
    // A scope cut: say exactly what is left out and how much time that gives back.
    const kept = option.tasks.find(t => t.id === request.task!.id);
    const cut = request.task.steps.filter(s => !kept?.steps.some(k => k.id === s.id));
    const minutes = cut.reduce((sum, s) => sum + s.remaining, 0);
    return { title: option.title, desc: `Leave out ${cut.map(s => `“${s.title}”`).join(' and ')} (${duration(minutes)}). Everything else fits without moving anything.`, tag: 'Less polish' };
  }
  const moved = option.commitments.map(now => ({ now, before: state.commitments.find(o => o.id === now.id) }))
    .find(x => x.before && (x.before.date !== x.now.date || x.before.start !== x.now.start));
  if (moved?.before) {
    return {
      title: moved.now.dimension === 'errands' ? 'Move the errand' : `Move ${moved.now.title.toLowerCase()}`,
      desc: `${moved.now.title} goes to ${dateLabel(moved.now.date)}, ${span12(moved.now.start, moved.now.end)}. That frees ${weekdayName(moved.before.date)} for study.`,
    };
  }
  const task = request.task;
  return { title: task ? `Start the ${task.title.toLowerCase()} earlier` : 'Study earlier in the week', desc: `Work moves to earlier days, so ${c ? weekdayName(c.date) : 'the deadline'} fits.` };
}

export interface ChangeRow { key: string; title: string; when: string; badge: 'New' | 'Moved' | 'Shortened' }

/** What a plan changes on the calendar, grouped the way a person would say it. */
export function changesOf(state: AppState, option: Candidate, request: Request): ChangeRow[] {
  const rows: ChangeRow[] = [];
  const c = request.commitment;
  for (const now of option.commitments) {
    const before = state.commitments.find(o => o.id === now.id);
    const when = `${weekdayName(now.date, true)}, ${span12(now.start, now.end)}`;
    if (before && (before.date !== now.date || before.start !== now.start)) rows.push({ key: now.id, title: now.title, when, badge: 'Moved' });
    else if (!before && c && now.id === c.id && (now.start !== c.start || now.end !== c.end)) rows.push({ key: now.id, title: eventName(now), when, badge: 'Shortened' });
  }
  const head = rows.length;
  const fresh = new Set(option.tasks.filter(t => !state.tasks.some(o => o.id === t.id)).map(t => t.id));
  let run: Block[] = [];
  const flush = () => {
    if (!run.length) return;
    const first = run[0]; const last = run[run.length - 1];
    const owner = option.tasks.find(t => t.id === first.taskId);
    const minutes = run.reduce((sum, b) => sum + b.end - b.start, 0);
    rows.push({ key: first.id, title: `${owner?.title ?? first.title} (${duration(minutes)})`, when: `${weekdayName(first.date, true)}, ${span12(first.start, last.end)}`, badge: fresh.has(first.taskId) ? 'New' : 'Moved' });
    run = [];
  };
  for (const b of planChanges(state, option).added.sort((a, b) => stamp(a).localeCompare(stamp(b)))) {
    const prev = run[run.length - 1];
    if (prev && (prev.taskId !== b.taskId || prev.date !== b.date || prev.end !== b.start)) flush();
    run.push(b);
  }
  flush();
  // Commitment changes first, then the new work, then study that only shifted.
  const blocks = rows.slice(head);
  return [...rows.slice(0, head), ...blocks.filter(r => r.badge === 'New'), ...blocks.filter(r => r.badge !== 'New')];
}
