import { AppState, Block, Candidate, Commitment, Preferences, Step, Task, Window, addDays, dateLabel, remaining, stamp, time, weekdayOf } from './model';
import { planWork, validatePlan } from './planner';
import { Conflict, OptionMetrics, conflictOptions, findConflict, optionMetrics } from './conflict';
import { planChanges } from './planChanges';

/** What the conversation hands the planner once it knows enough to act. */
export interface Request { task?: Task; commitment?: Commitment }

/**
 * The only four things that can happen to a request. The chat explains which one
 * happened; the calendar shows it.
 */
export type Outcome =
  | { kind: 'fits'; request: Request; plan: Candidate; options: Candidate[] }
  | { kind: 'options'; request: Request; options: Candidate[]; conflict?: Conflict }
  | { kind: 'none'; request: Request; shortfall: number }
  | { kind: 'clash'; request: Request; clash: Commitment };

const proposal = (state: AppState, id: string, title: string, parts: Pick<Candidate, 'commitments' | 'blocks' | 'tasks'>): Candidate =>
  ({ id, title, description: '', tradeOff: '', benefits: [], costs: [], sourceRevision: state.revision, ...parts });

const unchanged = (state: AppState) =>
  proposal(state, 'keep', 'Change nothing', { commitments: state.commitments, blocks: state.blocks, tasks: state.tasks });

/**
 * Places only the new task, into time nobody is using. Everything already on the
 * calendar stays exactly where it is — if that is impossible, returns null and the
 * caller treats the week as overloaded.
 */
export function placeCleanly(state: AppState, task: Task, perDay = Infinity): Block[] | null {
  const taken: Window[] = [...state.commitments, ...state.blocks.filter(b => stamp(b) >= state.now)];
  const used = new Map<string, number>();
  state.blocks.forEach(b => used.set(b.date, (used.get(b.date) || 0) + b.end - b.start));
  const draining = state.commitments.filter(c => c.dimension === 'physical' && c.demand === 'high' && c.kind !== 'recovery');

  const slots: Window[] = [];
  // Overlapping study windows must not offer the same 15 minutes twice.
  const seen = new Set<string>();
  for (const window of [...state.preferences.availability].sort((a, b) => stamp(a).localeCompare(stamp(b)))) {
    for (let start = Math.ceil(window.start / 15) * 15; start + 15 <= window.end; start += 15) {
      const slot = { date: window.date, start, end: start + 15 };
      if (seen.has(stamp(slot))) continue;
      seen.add(stamp(slot));
      if (stamp(slot) < state.now || stamp(slot, true) > task.deadline) continue;
      if (taken.some(t => t.date === slot.date && t.start < slot.end && slot.start < t.end)) continue;
      if (task.demand === 'high' && state.preferences.avoidAfterShift
        && draining.some(c => c.date === slot.date && c.end < slot.end && slot.start < c.end + 60)) continue;
      slots.push(slot);
    }
  }

  const blocks: Block[] = [];
  let cursor = 0;
  // `perDay` caps how much of this task lands on any one day, which spreads it out.
  const mine = new Map<string, number>();
  for (const step of task.steps) {
    let need = step.remaining;
    while (need > 0 && cursor < slots.length) {
      const slot = slots[cursor++];
      if ((used.get(slot.date) || 0) + 15 > state.preferences.dailyLimit) continue;
      if ((mine.get(slot.date) || 0) + 15 > perDay) continue;
      mine.set(slot.date, (mine.get(slot.date) || 0) + 15);
      const last = blocks[blocks.length - 1];
      if (last && last.stepId === step.id && last.date === slot.date && last.end === slot.start) last.end = slot.end;
      else blocks.push({ ...slot, id: `${task.id}/${step.id}/${stamp(slot)}`, taskId: task.id, stepId: step.id, title: step.title });
      used.set(slot.date, (used.get(slot.date) || 0) + 15);
      need -= 15;
    }
    if (need > 0) return null;
  }
  // The planner's own validator has the final word on whether this is a real plan.
  return validatePlan(state, [...state.tasks, task], state.commitments, [...state.blocks, ...blocks]).length ? null : blocks;
}

/** Due more than a week away. */
export const longTerm = (state: AppState, task: Task) => Date.parse(`${task.deadline}Z`) - Date.parse(`${state.now}Z`) > 7 * 86400000;

/** The gentlest spread that fits: the smallest daily share that still gets it all done. */
function placeGently(base: AppState, task: Task): Block[] | null {
  // If it cannot fit at all there is no spread to look for.
  if (!placeCleanly(base, task)) return null;
  const days = new Set(base.preferences.availability.filter(w => stamp(w) >= base.now && stamp(w, true) <= task.deadline).map(w => w.date)).size || 1;
  for (let cap = Math.max(30, Math.floor(remaining(task) / days / 15) * 15); cap < remaining(task); cap += 15) {
    const blocks = placeCleanly(base, task, cap);
    if (blocks) return blocks;
  }
  return placeCleanly(base, task);
}

/**
 * Cutting scope is a real choice on long projects: leave out optional steps (polish, a demo video)
 * one at a time, then all together, and keep the versions that then fit without moving anything.
 */
function trimmedPlans(state: AppState, base: AppState, task: Task): Candidate[] {
  const optional = task.steps.filter(s => s.optional && s.remaining > 0);
  const attempt = (skip: Step[]): Candidate | null => {
    const trimmed = { ...task, steps: task.steps.filter(s => !skip.includes(s)) };
    const blocks = trimmed.steps.length ? placeGently(base, trimmed) : null;
    return blocks ? proposal(state, `trim-${skip.map(s => s.id).join('+')}`, skip.length === 1 ? `Skip “${skip[0].title}”` : `Skip ${skip.length} optional steps`,
      { commitments: base.commitments, blocks: [...base.blocks, ...blocks], tasks: [...base.tasks, trimmed] }) : null;
  };
  const singles = optional.map(s => attempt([s])).filter((p): p is Candidate => !!p);
  if (singles.length || optional.length < 2) return singles;
  const all = attempt(optional);
  return all ? [all] : [];
}

/**
 * When a long project needs more time than the fortnight has free, find more time rather than fail:
 * study sessions on the weekends, or longer weekday evenings with a higher daily limit.
 * Each is the smallest such change that makes the project fit, raising the limit in half-hour steps.
 */
function extraTimePlans(state: AppState, base: AppState, task: Task): Candidate[] {
  if (!longTerm(state, task)) return [];
  const prefs = base.preferences;
  const days: string[] = [];
  for (let d = state.now.slice(0, 10); d <= task.deadline.slice(0, 10); d = addDays(d, 1)) days.push(d);
  const covered = (w: Window) => prefs.availability.some(a => a.date === w.date && a.start <= w.start && a.end >= w.end);
  const weekend = days.filter(d => weekdayOf(d) >= 5).flatMap(d => [{ date: d, start: 600, end: 780 }, { date: d, start: 840, end: 1020 }]).filter(w => !covered(w));
  // Every weekday evening until 9 PM: existing evening sessions run later, and evenings without one get one.
  // A session "runs into the evening" if it ends after 5 PM (e.g. Thursday 4:00–8:30 PM).
  const evening = (w: Window) => weekdayOf(w.date) < 5 && w.end > 1020;
  const stretched = prefs.availability.map(w => (evening(w) && w.end < 1260 ? { ...w, end: 1260 } : w));
  const bare = days.filter(d => weekdayOf(d) < 5 && !stretched.some(w => w.date === d && evening(w))).map(date => ({ date, start: 1080, end: 1260 }));
  const evenings = [...stretched, ...bare];
  const variants: [string, string, number, (limit: number) => Preferences][] = [
    ['extra-weekend', 'Use your weekends', prefs.dailyLimit, limit => ({ ...prefs, dailyLimit: limit, availability: [...prefs.availability, ...weekend] })],
    ['longer-days', 'Study longer on weekdays', prefs.dailyLimit + 30, limit => ({ ...prefs, dailyLimit: limit, availability: evenings })],
  ];
  const plans: Candidate[] = [];
  for (const [id, title, from, routine] of variants) {
    for (let limit = from; limit <= 300; limit += 30) {
      const preferences = routine(limit);
      const blocks = placeGently({ ...base, preferences }, task);
      if (!blocks) continue;
      plans.push({ ...proposal(state, id, title, { commitments: base.commitments, blocks: [...base.blocks, ...blocks], tasks: [...base.tasks, task] }), preferences });
      break;
    }
  }
  return plans;
}

function dominates(a: OptionMetrics, b: OptionMetrics) {
  const noWorse = a.bufferMinutes >= b.bufferMinutes && a.moved <= b.moved && a.conflictsLeft <= b.conflictsLeft
    && a.freeDays >= b.freeDays && a.longestSitting <= b.longestSitting && (a.protectedKept || !b.protectedKept);
  const better = a.bufferMinutes > b.bufferMinutes || a.moved < b.moved || a.conflictsLeft < b.conflictsLeft
    || a.freeDays > b.freeDays || a.longestSitting < b.longestSitting || (a.protectedKept && !b.protectedKept);
  return noWorse && better;
}

/**
 * Drops any option another option beats on every measure. Showing it would only
 * spend the student's attention on a choice nobody should make.
 */
export function honestOptions(state: AppState, options: Candidate[], conflict?: Conflict): Candidate[] {
  const metrics = options.map(o => optionMetrics(state, o, conflict));
  // Cutting scope has a cost the metrics cannot see, so scope cuts neither beat nor lose to other plans.
  // Nor does finding extra time, which costs rest the metrics do not measure.
  const cut = (o: Candidate) => o.id.startsWith('trim') || !!o.preferences;
  return options.filter((o, i) => o.id === 'keep' || cut(o)
    || !options.some((other, j) => j !== i && other.id !== 'keep' && !cut(other) && dominates(metrics[j], metrics[i])));
}

/** Re-plans existing work: one proposal when it fits as it is, a comparison when something must move. */
export function replan(state: AppState, tasks: Task[], request: Request = {}): Outcome {
  const result = planWork(state, tasks);
  if (!result.candidates.length) return { kind: 'none', request, shortfall: result.shortfall };
  const [first] = result.candidates;
  if (first.id === 'earlier') {
    const plan = { ...first, id: 'fits', title: 'Your plan, rebalanced' };
    return { kind: 'fits', request, plan, options: [plan] };
  }
  return { kind: 'options', request, options: honestOptions(state, [...result.candidates, unchanged(state)]) };
}

export function planRequest(state: AppState, request: Request): Outcome {
  const { task, commitment } = request;
  if (!task && !commitment) return replan(state, state.tasks, request);

  let base = state;
  if (commitment) {
    const conflict = findConflict(state, commitment);
    if (conflict.clashingCommitment) return { kind: 'clash', request, clash: conflict.clashingCommitment };
    if (conflict.displaced.length) {
      // The new commitment sits on scheduled work: that is overload by definition.
      const withTask = task ? { ...state, tasks: [...state.tasks, task] } : state;
      const raw = conflictOptions(withTask, conflict).map(o => (o.id === 'keep' ? unchanged(state) : o));
      const options = honestOptions(state, raw, conflict);
      if (!options.some(o => o.id !== 'keep')) return { kind: 'none', request, shortfall: conflict.displacedMinutes };
      return { kind: 'options', request, options, conflict };
    }
    base = { ...state, commitments: [...state.commitments, commitment] };
  }

  if (!task) {
    const plan = proposal(state, 'fits', `${commitment!.title} fits`, { commitments: base.commitments, blocks: base.blocks, tasks: base.tasks });
    return { kind: 'fits', request, plan, options: [plan] };
  }
  const early = placeCleanly(base, task);
  if (early) {
    // Free time can be used in more than one way: all at once, or a little each day.
    const place = (id: string, title: string, blocks: Block[]) =>
      proposal(state, id, title, { commitments: base.commitments, blocks: [...base.blocks, ...blocks], tasks: [...base.tasks, task] });
    const plans = [place('fits', 'Get it done early', early)];
    // The gentlest spread that still fits: the smallest daily share that works.
    let spread: Block[] | null = null;
    for (let cap = 30; cap < remaining(task) && !spread; cap += 15) spread = placeCleanly(base, task, cap);
    const same = (a: Block[], b: Block[]) => a.length === b.length && a.every((x, i) => stamp(x) === stamp(b[i]) && x.end === b[i].end);
    if (spread && !same(spread, early)) plans.push(place('fits-spread', 'A little each day', spread));
    // A project due weeks away should be worked on steadily, not crammed into the first free evenings.
    const options = honestOptions(state, longTerm(state, task) ? [...plans].reverse() : plans);
    return { kind: 'fits', request, plan: options[0], options };
  }
  // No free time left for it as the week stands: rebalance everything, or cut optional scope.
  const result = planWork(base, [...base.tasks, task]);
  const trims = trimmedPlans(state, base, task);
  const extra = extraTimePlans(state, base, task);
  if (!result.candidates.length && !trims.length && !extra.length) return { kind: 'none', request, shortfall: result.shortfall };
  const shaped = result.candidates.map(c => (c.id === 'earlier' ? { ...c, title: 'Reshuffle your study time' } : c));
  // A mix of kinds of fix, not three versions of the same one: moves, then more time, one scope cut, then longer days.
  const ordered = [...shaped, ...extra.slice(0, 1), ...trims.slice(0, 1), ...extra.slice(1), ...trims.slice(1)];
  return { kind: 'options', request, options: honestOptions(state, [...ordered, unchanged(state)]) };
}

/**
 * Study minutes still free from now until `until`: inside study windows, around everything booked,
 * within the daily limit. The honest "time available" figure for the fit check.
 */
export function freeStudyMinutes(state: AppState, until: string): number {
  const taken: Window[] = [...state.commitments, ...state.blocks.filter(b => stamp(b) >= state.now)];
  const used = new Map<string, number>();
  state.blocks.forEach(b => used.set(b.date, (used.get(b.date) || 0) + b.end - b.start));
  let free = 0;
  const seen = new Set<string>();
  for (const window of state.preferences.availability) {
    for (let start = Math.ceil(window.start / 15) * 15; start + 15 <= window.end; start += 15) {
      const slot = { date: window.date, start, end: start + 15 };
      if (seen.has(stamp(slot))) continue;
      seen.add(stamp(slot));
      if (stamp(slot) < state.now || stamp(slot, true) > until) continue;
      if (taken.some(t => t.date === slot.date && t.start < slot.end && slot.start < t.end)) continue;
      if ((used.get(slot.date) || 0) + 15 > state.preferences.dailyLimit) continue;
      used.set(slot.date, (used.get(slot.date) || 0) + 15);
      free += 15;
    }
  }
  return free;
}

/**
 * "Renegotiate the shift": the smallest cut to the new commitment (half-hour steps, never more than
 * half of it) after which the week works without moving anything you already had. It changes a
 * commitment the student does not control alone, so the app labels it as needing their employer's OK.
 */
export function shortenedShift(state: AppState, request: Request): Candidate | null {
  const c = request.commitment;
  if (!c || c.kind === 'recovery') return null;
  const untouched = (plan: Candidate) => plan.commitments.every(x => {
    const before = state.commitments.find(o => o.id === x.id);
    return !before || (before.date === x.date && before.start === x.start && before.end === x.end);
  });
  for (let cut = 30; cut <= (c.end - c.start) / 2; cut += 30) {
    // Starting later is tried first: a later start usually frees the study time just before it.
    for (const [start, end] of [[c.start + cut, c.end], [c.start, c.end - cut]]) {
      const outcome = planRequest(state, { ...request, commitment: { ...c, start, end } });
      const plans = outcome.kind === 'fits' ? [outcome.plan] : outcome.kind === 'options' ? outcome.options : [];
      const plan = plans.find(p => p.id !== 'keep' && untouched(p));
      if (plan) return { ...plan, id: 'shorten', title: 'Shorten the shift' };
    }
  }
  return null;
}

/** One sentence the chat can say after a plan is applied. */
export function appliedSummary(state: AppState, applied: Candidate): string {
  const changes = planChanges(state, applied);
  const parts: string[] = [];
  for (const c of applied.commitments.filter(c => !state.commitments.some(old => old.id === c.id))) {
    parts.push(`${c.title} is on ${dateLabel(c.date)}, ${time(c.start)}–${time(c.end)}`);
  }
  for (const m of changes.moved) parts.push(`${m.now.title} moved to ${dateLabel(m.now.date)}, ${time(m.now.start)}`);
  const days = [...new Set(changes.added.map(b => b.date))].sort();
  if (changes.added.length) {
    const where = days.length === 1 ? `on ${dateLabel(days[0])}` : `across ${dateLabel(days[0])} – ${dateLabel(days[days.length - 1])}`;
    parts.push(`${changes.added.length} study ${changes.added.length === 1 ? 'block' : 'blocks'} ${where}`);
  }
  if (!parts.length) return 'Done — nothing needed to move.';
  return `Done — ${parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`}.`;
}
