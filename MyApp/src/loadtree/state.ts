import { AppState, Candidate, Commitment, PlanData, Preferences, Task, planState, stamp, overlaps, remaining, validDate, taskErrors } from './model';
import { emptyWeek, makeDemo } from './demo';
import { validatePlan } from './planner';

export type Action =
  | { type: 'approve'; plan: Candidate }
  | { type: 'saveTask'; task: Task }
  | { type: 'undo' }
  | { type: 'reset'; empty?: boolean }
  | { type: 'setup'; preferences: Preferences; commitments: Commitment[] }
  | { type: 'progress'; taskId: string; stepId: string; remaining: number }
  | { type: 'delete'; taskId: string }
  | { type: 'addCommitment'; commitment: Commitment }
  | { type: 'removeCommitment'; id: string }
  /** One edit of a repeating event: several days change together and undo together. */
  | { type: 'replaceCommitments'; remove: string[]; add: Commitment[] }
  | { type: 'advance' };

export function setupErrors(preferences: Preferences, commitments: Commitment[]): string[] {
  const errors: string[] = [];
  if (!preferences.name.trim()) errors.push('Enter your name.');
  if (!Number.isInteger(preferences.dailyLimit) || preferences.dailyLimit < 15 || preferences.dailyLimit > 720 || preferences.dailyLimit % 15) errors.push('Choose a daily study limit in 15-minute increments, from 15 to 720 minutes.');
  if (!preferences.availability.length) errors.push('Add at least one study window.');
  for (const window of [...preferences.availability, ...commitments, ...commitments.flatMap(c => c.moveWindows || [])]) {
    if (!validDate(window.date) || !Number.isInteger(window.start) || !Number.isInteger(window.end) || window.start < 0 || window.end > 1440 || window.start >= window.end || window.start % 15 || window.end % 15) errors.push('Use valid dates and time ranges in 15-minute increments.');
  }
  if (commitments.some(c => !c.title.trim())) errors.push('Name every commitment.');
  commitments.forEach((c, i) => { if (commitments.slice(i + 1).some(other => overlaps(c, other))) errors.push('Two commitments overlap. Adjust their times.'); });
  preferences.availability.forEach((w, i) => { if (preferences.availability.slice(i + 1).some(other => overlaps(w, other))) errors.push('Study windows overlap. Combine or adjust them.'); });
  return [...new Set(errors)];
}
export function snapshot(state: AppState): PlanData {
  const { version, revision, undo, ...data } = state;
  return JSON.parse(JSON.stringify(data));
}
export function reducer(state: AppState, action: Action): AppState {
  const updated = (patch: Partial<AppState>): AppState => ({ ...state, ...patch, revision: state.revision + 1 });
  if (action.type === 'reset') return { ...(action.empty ? emptyWeek() : makeDemo(true)), revision: state.revision + 1 };
  if (action.type === 'undo') return state.undo ? { ...state, ...state.undo, revision: state.revision + 1, undo: null } : state;
  if (action.type === 'saveTask') {
    if (taskErrors(action.task).length) return state;
    return updated({ tasks: [...state.tasks.filter(t => t.id !== action.task.id), action.task], blocks: state.blocks.filter(b => b.taskId !== action.task.id || stamp(b) < state.now), undo: snapshot(state) });
  }
  if (action.type === 'setup') {
    if (setupErrors(action.preferences, action.commitments).length) return state;
    // Constraints have changed: keep task progress, clear future work for a fresh preview.
    return updated({ preferences: action.preferences, commitments: action.commitments, setupDone: true, blocks: state.blocks.filter(b => stamp(b) < state.now), undo: snapshot(state) });
  }
  if (action.type === 'approve') {
    const plan = action.plan;
    // A plan that finds more time is checked against, and saves, its new routine.
    if (plan.sourceRevision !== state.revision || validatePlan(planState(state, plan), plan.tasks, plan.commitments, plan.blocks).length) return state;
    return updated({ tasks: plan.tasks, commitments: plan.commitments, blocks: plan.blocks, ...(plan.preferences ? { preferences: plan.preferences } : {}), undo: snapshot(state) });
  }
  if (action.type === 'addCommitment') {
    const next = [...state.commitments, action.commitment];
    if (setupErrors(state.preferences, next).length) return state;
    // A new fixed block can invalidate scheduled work, so clear future study blocks.
    return updated({ commitments: next, blocks: state.blocks.filter(b => stamp(b) < state.now), undo: snapshot(state) });
  }
  if (action.type === 'replaceCommitments') {
    const next = [...state.commitments.filter(c => !action.remove.includes(c.id)), ...action.add];
    if (setupErrors(state.preferences, next).length) return state;
    const blocks = action.add.length ? state.blocks.filter(b => stamp(b) < state.now) : state.blocks;
    return updated({ commitments: next, blocks, undo: snapshot(state) });
  }
  if (action.type === 'removeCommitment') {
    if (!state.commitments.some(c => c.id === action.id)) return state;
    return updated({ commitments: state.commitments.filter(c => c.id !== action.id), undo: snapshot(state) });
  }
  if (action.type === 'delete') return updated({ tasks: state.tasks.filter(t => t.id !== action.taskId), blocks: state.blocks.filter(b => b.taskId !== action.taskId), undo: snapshot(state) });
  if (action.type === 'progress') {
    if (action.remaining < 0 || action.remaining > 1440 || action.remaining % 15 || !Number.isInteger(action.remaining)) return state;
    const task = state.tasks.find(t => t.id === action.taskId);
    if (!task || !task.steps.some(s => s.id === action.stepId)) return state;
    const tasks = state.tasks.map(t => t.id !== action.taskId ? t : { ...t, steps: t.steps.map(s => s.id !== action.stepId ? s : { ...s, remaining: action.remaining }) });
    const blocks = action.remaining === 0 ? state.blocks.filter(b => !(b.taskId === action.taskId && b.stepId === action.stepId && stamp(b) >= state.now)) : state.blocks;
    return updated({ tasks, blocks, undo: snapshot(state) });
  }
  if (action.type === 'advance') {
    const now = '2026-09-09T08:00';
    if (state.now >= now) return state;
    // Explicitly confirmed by the demo operator: work before Wednesday is done.
    const tasks = state.tasks.map(t => ({ ...t, steps: t.steps.map(s => {
      const elapsed = state.blocks.filter(b => b.taskId === t.id && b.stepId === s.id && stamp(b) >= state.now && stamp(b, true) <= now).reduce((sum, b) => sum + b.end - b.start, 0);
      return { ...s, remaining: Math.max(0, s.remaining - elapsed) };
    }) }));
    return updated({ now, tasks, undo: snapshot(state) });
  }
  return state;
}

export function parseSaved(value: string | null): AppState | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as AppState;
    if (data.version !== 1 || !Number.isInteger(data.revision) || !Array.isArray(data.tasks) || !Array.isArray(data.commitments) || !Array.isArray(data.blocks) || typeof data.now !== 'string' || !data.preferences || setupErrors(data.preferences, data.commitments).length) return null;
    if (data.tasks.some(t => typeof t.title !== 'string' || !Array.isArray(t.steps) || !Number.isFinite(remaining(t)) || taskErrors(t).length)) return null;
    return { ...data, undo: null };
  } catch { return null; }
}
