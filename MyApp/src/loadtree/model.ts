export type Dimension = 'mental' | 'time' | 'physical' | 'social' | 'errands';
export type Demand = 'low' | 'medium' | 'high';
export type Day = string;
export interface Window { date: Day; start: number; end: number }
export interface Commitment extends Window {
  id: string;
  title: string;
  kind: 'fixed' | 'flexible' | 'recovery';
  dimension: Dimension;
  demand: Demand;
  moveWindows?: Window[];
}
export interface Preferences {
  name: string;
  dailyLimit: number;
  avoidAfterShift: boolean;
  availability: Window[];
}
/** `optional` marks scope that can be cut when time runs short (e.g. a demo video). */
export interface Step { id: string; title: string; estimate: number; remaining: number; optional?: boolean }
export interface Task {
  id: string;
  title: string;
  deadline: string;
  demand: Demand;
  steps: Step[];
}
export interface Block extends Window { id: string; taskId: string; stepId: string; title: string }
export interface PlanData {
  preferences: Preferences;
  commitments: Commitment[];
  tasks: Task[];
  blocks: Block[];
  now: string;
  setupDone: boolean;
}
export interface AppState extends PlanData { version: 1; revision: number; undo: PlanData | null }
export interface Candidate {
  id: string;
  title: string;
  description: string;
  tradeOff: string;
  /** Concrete consequences, one line each — never vague balance language. */
  benefits: string[];
  costs: string[];
  commitments: Commitment[];
  blocks: Block[];
  tasks: Task[];
  sourceRevision: number;
  movedId?: string;
  /** A plan that finds more time (weekend sessions, longer days) also changes the weekly routine. */
  preferences?: Preferences;
}
/** The state a plan should be checked against: its own routine, if it brings one. */
export const planState = <S extends { preferences: Preferences }>(state: S, plan: Pick<Candidate, 'preferences'>): S =>
  (plan.preferences ? { ...state, preferences: plan.preferences } : state);
export interface PlanningResult { candidates: Candidate[]; required: number; available: number; shortfall: number }
export const WEEK = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
export const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** How many weeks ahead the plan reaches, so projects due in a fortnight still have somewhere to go. */
export const HORIZON_WEEKS = 3;
/** A weekly routine's dates across the planning horizon: the day itself, then the same weekday after. */
export const weekly = (date: string) => Array.from({ length: HORIZON_WEEKS }, (_, k) => addDays(date, k * 7));
/** 0 = Monday … 6 = Sunday. */
export const weekdayOf = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
export const time = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const stamp = (w: Window, end = false) => `${w.date}T${time(end ? w.end : w.start)}`;
export const duration = (minutes: number) => minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
export const dateLabel = (date: string, long = false) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { weekday: long ? 'long' : 'short', day: 'numeric', month: 'short' });
export const remaining = (task: Task) => task.steps.reduce((sum, step) => sum + step.remaining, 0);
export const overlaps = (a: Window, b: Window) => a.date === b.date && a.start < b.end && b.start < a.end;
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
export function taskErrors(task: Task): string[] {
  const errors: string[] = [];
  if (!task.title.trim()) errors.push('Give your task a name.');
  if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(task.deadline) || !validDate(task.deadline.slice(0, 10))) errors.push('Enter a valid deadline.');
  if (!task.steps.length) errors.push('Add at least one step.');
  if (new Set(task.steps.map(s => s.id)).size !== task.steps.length) errors.push('Each step must have its own ID.');
  if (task.steps.some(s => !s.title.trim() || !Number.isInteger(s.remaining) || s.remaining < 0 || s.remaining > 1440 || s.remaining % 15 !== 0 || s.estimate < 15)) errors.push('Name each step and use durations in 15-minute increments (up to 24 hours).');
  return errors;
}
