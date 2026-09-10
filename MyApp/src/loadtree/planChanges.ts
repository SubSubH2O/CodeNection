import { AppState, Block, Candidate, Commitment, stamp } from './model';

export const slotKey = (item: { id: string; date: string; start: number; end: number; taskId?: string; stepId?: string }) => `${item.taskId && item.stepId ? `${item.taskId}/${item.stepId}` : item.id}|${item.date}|${item.start}|${item.end}`;
export interface PlanChanges { added: Block[]; removed: Block[]; moved: { now: Commitment; before: Commitment }[]; total: number; days: Set<string> }
export function planChanges(state: AppState, plan?: Candidate | null): PlanChanges {
  if (!plan) return { added: [], removed: [], moved: [], total: 0, days: new Set() };
  const saved = new Set(state.blocks.map(slotKey));
  const added = plan.blocks.filter(b => !saved.has(slotKey(b)) && stamp(b) >= state.now);
  const removed = state.blocks.filter(b => stamp(b) >= state.now && !plan.blocks.some(p => slotKey(p) === slotKey(b)));
  const moved = state.commitments.flatMap(before => {
    const now = plan.commitments.find(c => c.id === before.id);
    return now && slotKey(now) !== slotKey(before) ? [{ now, before }] : [];
  });
  const newEvents = plan.commitments.filter(c => !state.commitments.some(old => old.id === c.id));
  const days = new Set([...added, ...removed, ...newEvents].map(b => b.date));
  moved.forEach(m => { days.add(m.before.date); days.add(m.now.date); });
  return { added, removed, moved, total: added.length + moved.length + newEvents.length, days };
}
export const changesOn = (changes: PlanChanges, date: string) => changes.added.filter(b => b.date === date).length + changes.removed.filter(b => b.date === date).length + changes.moved.filter(m => m.now.date === date || m.before.date === date).length;
