import { AppState, Block, Candidate, Commitment, Task, Window, dateLabel, remaining, stamp, time } from './model';
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
  for (const window of [...state.preferences.availability].sort((a, b) => stamp(a).localeCompare(stamp(b)))) {
    for (let start = Math.ceil(window.start / 15) * 15; start + 15 <= window.end; start += 15) {
      const slot = { date: window.date, start, end: start + 15 };
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
  return options.filter((o, i) => o.id === 'keep'
    || !options.some((other, j) => j !== i && other.id !== 'keep' && dominates(metrics[j], metrics[i])));
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
    const options = honestOptions(state, plans);
    return { kind: 'fits', request, plan: options[0], options };
  }
  // No free time left for it as the week stands: rebalance everything.
  const result = planWork(base, [...base.tasks, task]);
  if (!result.candidates.length) return { kind: 'none', request, shortfall: result.shortfall };
  const shaped = result.candidates.map(c => (c.id === 'earlier' ? { ...c, title: 'Reshuffle your study time' } : c));
  return { kind: 'options', request, options: honestOptions(state, [...shaped, unchanged(state)]) };
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
