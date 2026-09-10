import { AppState, Commitment, Demand, Dimension, Task, dateLabel, duration, remaining, stamp } from './model';

// Demand-weighted minutes per week that counts as a full week for each area.
// These are reference loads, not health measurements or clinical capacity.
const WEIGHT: Record<Demand, number> = { low: 1, medium: 1.5, high: 2 };
const REFERENCE: Record<Dimension, number> = { mental: 1400, time: 1100, physical: 500, social: 150, errands: 170 };

export const ORDER: Dimension[] = ['mental', 'time', 'physical', 'social', 'errands'];
export const LABEL: Record<Dimension, string> = { mental: 'Mental', time: 'Time', physical: 'Physical', social: 'Social', errands: 'Errands' };
export const ICON: Record<Dimension, string> = { mental: 'mental', time: 'clock', physical: 'physical', social: 'social', errands: 'errands' };

export type Tone = 'calm' | 'moderate' | 'heavy';
export const toneFor = (score: number): Tone => (score >= 75 ? 'heavy' : score >= 55 ? 'moderate' : 'calm');

export interface Contributor { id: string; title: string; detail: string }
export interface DimensionLoad { id: Dimension; label: string; score: number; tone: Tone; minutes: number; contributors: Contributor[] }

const liveCommitments = (state: AppState): Commitment[] => state.commitments.filter(c => c.kind !== 'recovery' && stamp(c, true) > state.now);
const liveTasks = (state: AppState): Task[] => state.tasks.filter(t => remaining(t) > 0);

export function dimensionLoad(state: AppState, id: Dimension): DimensionLoad {
  const contributors: Contributor[] = [];
  let weighted = 0;
  let minutes = 0;
  for (const c of liveCommitments(state)) {
    if (id !== 'time' && c.dimension !== id) continue;
    const span = c.end - c.start;
    minutes += span;
    weighted += id === 'time' ? span : span * WEIGHT[c.demand];
    contributors.push({ id: c.id, title: c.title, detail: `${dateLabel(c.date)} · ${duration(span)}${id === 'time' ? '' : ` · ${c.demand} demand`}` });
  }
  if (id === 'mental' || id === 'time') {
    for (const t of liveTasks(state)) {
      const left = remaining(t);
      minutes += left;
      weighted += id === 'time' ? left : left * WEIGHT[t.demand];
      contributors.push({ id: t.id, title: t.title, detail: `${duration(left)} of work left · due ${dateLabel(t.deadline)}` });
    }
  }
  const score = Math.min(100, Math.round((weighted / REFERENCE[id]) * 100));
  return { id, label: LABEL[id], score, tone: toneFor(score), minutes, contributors };
}

export const loadScores = (state: AppState): DimensionLoad[] => ORDER.map(id => dimensionLoad(state, id));

export function summarise(load: DimensionLoad): string {
  if (!load.contributors.length) return 'Nothing is competing for this area right now.';
  const noun = load.id === 'mental' ? 'focused work' : load.id === 'time' ? 'booked time' : load.id === 'physical' ? 'physical commitments' : load.id === 'social' ? 'social plans' : 'errands';
  return `${duration(load.minutes)} of ${noun} left this week.`;
}
