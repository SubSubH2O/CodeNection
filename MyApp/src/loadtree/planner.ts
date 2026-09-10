import { AppState, Block, Candidate, Commitment, PlanningResult, Task, Window, overlaps, remaining, stamp, taskErrors, dateLabel, duration, time } from './model';

function slotsFor(state: AppState, commitments: Commitment[], task: Task): Window[] {
  const unique = new Map<string, Window>();
  for (const window of state.preferences.availability) {
    for (let start = Math.ceil(window.start / 15) * 15; start + 15 <= window.end; start += 15) {
      const slot = { date: window.date, start, end: start + 15 };
      if (stamp(slot) < state.now || stamp(slot, true) > task.deadline) continue;
      if (commitments.some(c => overlaps(c, slot))) continue;
      if (task.demand === 'high' && state.preferences.avoidAfterShift && commitments.some(c => c.dimension === 'physical' && c.demand === 'high' && c.kind !== 'recovery' && overlaps({ ...c, start: c.end, end: c.end + 60 }, slot))) continue;
      unique.set(stamp(slot), slot);
    }
  }
  return [...unique.values()].sort((a, b) => stamp(a).localeCompare(stamp(b)));
}

function allocate(state: AppState, tasks: Task[], commitments: Commitment[], skipFirstDay = false) {
  const historical = state.blocks.filter(b => stamp(b) < state.now);
  const used = new Map<string, number>();
  historical.forEach(b => used.set(b.date, (used.get(b.date) || 0) + b.end - b.start));
  const blocks: Block[] = [];
  let shortage = 0;
  for (const task of [...tasks].sort((a, b) => a.deadline.localeCompare(b.deadline) || a.id.localeCompare(b.id))) {
    const slots = slotsFor(state, commitments, task).filter(s => !skipFirstDay || s.date !== state.now.slice(0, 10));
    let cursor = 0;
    for (const step of task.steps) {
      let needed = step.remaining;
      while (needed > 0 && cursor < slots.length) {
        const slot = slots[cursor++];
        if (blocks.some(b => overlaps(b, slot)) || (used.get(slot.date) || 0) + 15 > state.preferences.dailyLimit) continue;
        const previous = blocks[blocks.length - 1];
        if (previous && previous.stepId === step.id && previous.date === slot.date && previous.end === slot.start) previous.end = slot.end;
        else blocks.push({ ...slot, id: `${task.id}/${step.id}/${stamp(slot)}`, taskId: task.id, stepId: step.id, title: step.title });
        used.set(slot.date, (used.get(slot.date) || 0) + 15);
        needed -= 15;
      }
      shortage += Math.max(0, needed);
    }
  }
  return { blocks: [...historical, ...blocks], shortage };
}

export function validatePlan(state: AppState, tasks: Task[], commitments: Commitment[], blocks: Block[]): string[] {
  const errors: string[] = tasks.flatMap(taskErrors);
  for (const original of state.commitments) {
    const changed = commitments.find(c => c.id === original.id);
    if (!changed) { errors.push(`Missing commitment: ${original.title}`); continue; }
    if (JSON.stringify(changed) === JSON.stringify(original)) continue;
    if (original.kind !== 'flexible') errors.push(`Protected or fixed commitment moved: ${original.title}`);
    else if (!original.moveWindows?.some(w => w.date === changed.date && w.start <= changed.start && w.end >= changed.end) || original.end - original.start !== changed.end - changed.start) errors.push(`Move outside permitted window: ${original.title}`);
  }
  commitments.forEach((c, i) => { if (commitments.slice(i + 1).some(other => overlaps(c, other))) errors.push('Commitments overlap.'); });
  const future = blocks.filter(b => stamp(b) >= state.now);
  const totals = new Map<string, number>();
  for (const block of blocks) totals.set(block.date, (totals.get(block.date) || 0) + block.end - block.start);
  if ([...totals.values()].some(t => t > state.preferences.dailyLimit)) errors.push('Daily study limit exceeded.');
  future.forEach((block, i) => {
    const task = tasks.find(t => t.id === block.taskId);
    if (!task || !task.steps.some(s => s.id === block.stepId)) { errors.push('Unknown roadmap step.'); return; }
    if (block.end <= block.start || block.start % 15 || block.end % 15) errors.push('Invalid work duration.');
    if (stamp(block, true) > task.deadline) errors.push('Work ends after deadline.');
    if (!state.preferences.availability.some(w => w.date === block.date && w.start <= block.start && w.end >= block.end)) errors.push('Outside study windows.');
    if (commitments.some(c => overlaps(c, block)) || future.slice(i + 1).some(b => overlaps(b, block))) errors.push('Schedule overlap.');
    const allowed = slotsFor(state, commitments, task);
    for (let start = block.start; start < block.end; start += 15) if (!allowed.some(s => s.date === block.date && s.start === start)) errors.push('Demand or availability constraint violated.');
  });
  for (const task of tasks) {
    let lastEnd = state.now;
    for (const step of task.steps) {
      const allocated = future.filter(b => b.taskId === task.id && b.stepId === step.id).sort((a, b) => stamp(a).localeCompare(stamp(b)));
      if (allocated.reduce((sum, b) => sum + b.end - b.start, 0) !== step.remaining) errors.push('Remaining work is not fully scheduled.');
      for (const block of allocated) {
        if (stamp(block) < lastEnd) errors.push('Roadmap order violated.');
        lastEnd = stamp(block, true);
      }
    }
  }
  return [...new Set(errors)];
}

export function planWork(state: AppState, tasks = state.tasks): PlanningResult {
  if (tasks.some(t => taskErrors(t).length)) throw new Error('Review the task title, deadline and step durations.');
  const required = tasks.reduce((sum, task) => sum + remaining(task), 0);
  const original = allocate(state, tasks, state.commitments);
  let bestShortfall = original.shortage;
  const result: PlanningResult = { candidates: [], required, available: required - original.shortage, shortfall: original.shortage };
  function add(id: string, title: string, description: string, tradeOff: string, commitments: Commitment[], benefits: string[], costs: string[], skipFirstDay = false, movedId?: string) {
    const allocation = allocate(state, tasks, commitments, skipFirstDay);
    bestShortfall = Math.min(bestShortfall, allocation.shortage);
    if (allocation.shortage || validatePlan(state, tasks, commitments, allocation.blocks).length) return;
    result.candidates.push({ id, title, description, tradeOff, benefits, costs, commitments, blocks: allocation.blocks, tasks, sourceRevision: state.revision, movedId });
  }
  add('earlier', 'Move the work earlier', 'Keep every existing commitment exactly where it is, and spread the remaining work through study time you already have free.',
    'Your remaining study evenings get busier.', state.commitments,
    ['Every commitment stays where it is', 'Protected sleep untouched'],
    ['Less spare room before the deadline']);
  for (const event of state.commitments.filter(c => c.kind === 'flexible' && stamp(c) >= state.now)) {
    for (const destination of event.moveWindows || []) {
      const moved = { ...event, date: destination.date, start: destination.start, end: destination.start + event.end - event.start };
      if (moved.end > destination.end || stamp(moved) < state.now || state.commitments.some(c => c.id !== event.id && overlaps(c, moved))) continue;
      // Rescheduling rule: do not move entertainment or flexible activities into study time
      if (state.preferences.availability.some(w => overlaps(w, moved))) continue;
      const commitments = state.commitments.map(c => c.id === event.id ? moved : c);
      const title = `Move ${event.title.toLowerCase()}`;
      const description = `Free ${duration(event.end - event.start)} on ${dateLabel(event.date)}. ${event.title} moves to ${dateLabel(moved.date)}.`;
      const trade = `Do the errand on ${dateLabel(moved.date)} instead. Its permitted window and your recovery stay intact.`;
      const benefits = ['Your task keeps its current shape', 'Fixed commitments and protected sleep stay put'];
      const costs = [`${event.title} moves to ${dateLabel(moved.date)}, ${time(moved.start)}`];
      const count = result.candidates.length;
      if (count) add(`move-${event.id}`, title, description, trade, commitments, benefits, costs, true, event.id);
      if (result.candidates.length === count) add(`move-${event.id}`, title, description, trade, commitments, benefits, costs, false, event.id);
      if (result.candidates.length >= 3) return result;
    }
  }
  if (!result.candidates.length) {
    result.shortfall = bestShortfall;
    result.available = required - bestShortfall;
  }
  return result;
}

export function futureCoverage(state: AppState, task: Task) {
  return state.blocks.filter(b => b.taskId === task.id && stamp(b) >= state.now).reduce((sum, b) => sum + b.end - b.start, 0);
}
