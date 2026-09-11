import { AppState, Commitment, Demand, Dimension, Task, addDays, dateLabel, duration, remaining, stamp } from './model';

// Demand-weighted minutes per week that counts as a full week for each area.
// These are reference loads, not health measurements or clinical capacity.
const WEIGHT: Record<Demand, number> = { low: 1, medium: 1.5, high: 2 };
// Sized for a full university week: a normal term week reads as "manageable" to "getting high", not maxed out.
const REFERENCE: Record<Dimension, number> = { mental: 4100, time: 3000, physical: 500, social: 1200, errands: 170 };

export const ORDER: Dimension[] = ['mental', 'time', 'physical', 'social', 'errands'];
export const LABEL: Record<Dimension, string> = { mental: 'Mental', time: 'Time', physical: 'Physical', social: 'Social', errands: 'Errands' };
export const ICON: Record<Dimension, string> = { mental: 'mental', time: 'clock', physical: 'physical', social: 'social', errands: 'errands' };

export type Tone = 'calm' | 'moderate' | 'heavy';
export const toneFor = (score: number): Tone => (score >= 75 ? 'heavy' : score >= 55 ? 'moderate' : 'calm');

/** One thing feeding an area's score, with its share of the score in points. */
export interface Contributor { id: string; title: string; detail: string; points: number; source: 'commitment' | 'task'; date: string; start?: number }
export interface DimensionLoad {
  id: Dimension; label: string; score: number; tone: Tone; minutes: number; contributors: Contributor[];
  /** The score split by where it comes from; the rows add up to the score exactly. */
  breakdown: { label: string; points: number }[];
  /** The day carrying the most of this area's load, if any. */
  busiestDay?: string;
}

// The tree shows this week: commitments in the next seven days, and each task's share of work for them.
const weekEnd = (state: AppState) => addDays(state.now.slice(0, 10), 6);
const daysUntil = (state: AppState, deadline: string) => Math.max(1, Math.round((Date.parse(`${deadline.slice(0, 10)}T12:00:00Z`) - Date.parse(`${state.now.slice(0, 10)}T12:00:00Z`)) / 86400000) + 1);
const liveCommitments = (state: AppState): Commitment[] => state.commitments.filter(c => c.kind !== 'recovery' && stamp(c, true) > state.now && c.date <= weekEnd(state));
const liveTasks = (state: AppState): Task[] => state.tasks.filter(t => remaining(t) > 0);
const DEMAND_WORD: Record<Demand, string> = { low: 'light', medium: 'moderate', high: 'focused' };
/** What the two sources are called in each area's score breakdown. */
const SOURCES: Record<Dimension, { commitment: string; task: string }> = {
  mental: { commitment: 'Classes & meetings', task: 'Coursework to do' },
  time: { commitment: 'Booked commitments', task: 'Work still to schedule' },
  physical: { commitment: 'Shifts & training', task: 'Tasks' },
  social: { commitment: 'Plans with people', task: 'Tasks' },
  errands: { commitment: 'Errands & admin', task: 'Tasks' },
};

/** Rounds shares to whole points that still add up to `total` (largest remainder first). */
function apportion(raw: number[], total: number): number[] {
  const sum = raw.reduce((a, b) => a + b, 0);
  if (!sum) return raw.map(() => 0);
  const exact = raw.map(r => (r / sum) * total);
  const whole = exact.map(Math.floor);
  let left = total - whole.reduce((a, b) => a + b, 0);
  exact.map((e, i) => ({ i, f: e - Math.floor(e) })).sort((a, b) => b.f - a.f).forEach(({ i }) => { if (left > 0) { whole[i]++; left--; } });
  return whole;
}

export function dimensionLoad(state: AppState, id: Dimension): DimensionLoad {
  const items: (Omit<Contributor, 'points'> & { weighted: number })[] = [];
  let minutes = 0;
  for (const c of liveCommitments(state)) {
    if (id !== 'time' && c.dimension !== id) continue;
    const span = c.end - c.start;
    minutes += span;
    items.push({ id: c.id, title: c.title, source: 'commitment', date: c.date, start: c.start, weighted: id === 'time' ? span : span * WEIGHT[c.demand],
      detail: `${dateLabel(c.date)} · ${duration(span)}${id === 'time' ? '' : ` · ${c.demand} demand`}` });
  }
  if (id === 'mental' || id === 'time') {
    for (const t of liveTasks(state)) {
      const left = remaining(t);
      // Work due later only counts for the part of it that belongs to this week.
      const thisWeek = Math.round(left * Math.min(1, 7 / daysUntil(state, t.deadline)));
      minutes += thisWeek;
      items.push({ id: t.id, title: t.title, source: 'task', date: t.deadline.slice(0, 10), weighted: id === 'time' ? thisWeek : thisWeek * WEIGHT[t.demand],
        detail: `${duration(left)} left · due ${dateLabel(t.deadline)}${id === 'time' ? '' : ` · ${DEMAND_WORD[t.demand]} demand`}` });
    }
  }
  const weighted = items.reduce((sum, i) => sum + i.weighted, 0);
  const score = Math.min(100, Math.round((weighted / REFERENCE[id]) * 100));
  const points = apportion(items.map(i => i.weighted), score);
  const contributors: Contributor[] = items.map(({ weighted: _w, ...rest }, i) => ({ ...rest, points: points[i] })).sort((a, b) => b.points - a.points);

  const bySource = (source: Contributor['source']) => contributors.filter(c => c.source === source).reduce((sum, c) => sum + c.points, 0);
  const breakdown = (['commitment', 'task'] as const).map(source => ({ label: SOURCES[id][source], points: bySource(source) })).filter(r => r.points > 0);

  const perDay = new Map<string, number>();
  items.forEach(i => perDay.set(i.date, (perDay.get(i.date) || 0) + i.weighted));
  const busiestDay = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return { id, label: LABEL[id], score, tone: toneFor(score), minutes, contributors, breakdown, busiestDay };
}

export const loadScores = (state: AppState): DimensionLoad[] => ORDER.map(id => dimensionLoad(state, id));

// Demand-weighted minutes that make one full day — a reference, like the weekly ones above.
// A normal class day (4h of lectures, 2h of focus work) reads about 70%, not maxed out.
const DAY_REFERENCE = 1000;

/** How loaded one day is, from its commitments and study (optionally as a proposed plan would leave it). */
export function dayLoad(state: AppState, date: string, plan?: Pick<AppState, 'commitments' | 'blocks' | 'tasks'> | null): { score: number; tone: Tone } {
  const commitments = (plan?.commitments ?? state.commitments).filter(c => c.date === date && c.kind !== 'recovery');
  const blocks = (plan?.blocks ?? state.blocks).filter(b => b.date === date);
  const tasks = plan?.tasks ?? state.tasks;
  let weighted = 0;
  for (const c of commitments) weighted += (c.end - c.start) * WEIGHT[c.demand];
  for (const b of blocks) weighted += (b.end - b.start) * WEIGHT[tasks.find(t => t.id === b.taskId)?.demand ?? 'medium'];
  const score = Math.min(100, Math.round((weighted / DAY_REFERENCE) * 100));
  return { score, tone: toneFor(score) };
}
export const dayStatus = (l: { score: number; tone: Tone }) => (l.tone === 'heavy' ? 'Heavy' : l.tone === 'moderate' ? 'Getting high' : l.score < 35 ? 'Light' : 'Manageable');

export function summarise(load: DimensionLoad): string {
  if (!load.contributors.length) return 'Nothing is competing for this area right now.';
  const noun = load.id === 'mental' ? 'focused work' : load.id === 'time' ? 'booked time' : load.id === 'physical' ? 'physical commitments' : load.id === 'social' ? 'social plans' : 'errands';
  return `${duration(load.minutes)} of ${noun} left this week.`;
}
