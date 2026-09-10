import { Commitment, Dimension, WEEK } from './model';

/** Anything that happens at a set time on chosen days: a study window, a class, sleep. */
export interface Routine {
  name: string;
  start: number;
  end: number;
  days: string[];
  kind: Commitment['kind'];
  dimension: Dimension;
}

/** Commitments with the same name, time and type are one repeating routine. */
export function groupCommitments(all: Commitment[]): Commitment[][] {
  const groups = new Map<string, Commitment[]>();
  for (const c of all) {
    const key = `${c.title}|${c.start}|${c.end}|${c.kind}`;
    groups.set(key, [...(groups.get(key) || []), c]);
  }
  return [...groups.values()].sort((a, b) => a[0].start - b[0].start);
}

export const routineOf = (group: Commitment[]): Routine => ({
  name: group[0].title,
  start: group[0].start,
  end: group[0].end,
  days: group.map(c => c.date),
  kind: group[0].kind,
  dimension: group[0].dimension,
});

/** The commitments a routine becomes: one per chosen day, keeping ids for days that already existed.
 * When end < start (overnight routine), splits into evening [start, 1440] on day D and morning [0, end] on day D+1.
 */
export function commitmentsFor(old: Commitment[], r: Routine): Commitment[] {
  const base = old[0]?.id ? old[0].id.replace(/-(eve|morn)$/, '') : `event-${Date.now()}`;
  if (r.end < r.start) {
    const result: Commitment[] = [];
    WEEK.filter(d => r.days.includes(d)).forEach(date => {
      const idx = WEEK.indexOf(date);
      const nextDate = WEEK[(idx + 1) % WEEK.length];
      const prevEve = old.find(o => o.date === date && o.end === 1440);
      const prevMorn = old.find(o => o.date === nextDate && o.start === 0);

      result.push({
        ...(prevEve ?? {}),
        id: prevEve?.id ?? `${base}-${date}-eve`,
        title: r.name,
        date,
        start: r.start,
        end: 1440,
        kind: r.kind,
        dimension: r.kind === 'recovery' ? 'physical' : r.dimension,
        demand: r.kind === 'recovery' ? 'low' : prevEve?.demand ?? 'medium',
      } as Commitment);

      result.push({
        ...(prevMorn ?? {}),
        id: prevMorn?.id ?? `${base}-${nextDate}-morn`,
        title: r.name,
        date: nextDate,
        start: 0,
        end: r.end,
        kind: r.kind,
        dimension: r.kind === 'recovery' ? 'physical' : r.dimension,
        demand: r.kind === 'recovery' ? 'low' : prevMorn?.demand ?? 'medium',
      } as Commitment);
    });
    return result;
  }
  const length = r.end - r.start;
  return WEEK.filter(d => r.days.includes(d)).map(date => {
    const prev = old.find(o => o.date === date) ?? old[0];
    const keepMove = r.kind === 'flexible' && prev?.moveWindows?.length && prev.moveWindows[0].end - prev.moveWindows[0].start === length;
    return {
      ...(prev ?? {}),
      id: old.find(o => o.date === date)?.id ?? `${base}-${date}`,
      title: r.name,
      date,
      start: r.start,
      end: r.end,
      kind: r.kind,
      dimension: r.kind === 'recovery' ? 'physical' : r.dimension,
      demand: r.kind === 'recovery' ? 'low' : prev?.demand ?? 'medium',
      // A plan may only move a flexible event into a slot it is allowed to use.
      moveWindows: r.kind !== 'flexible' ? undefined : keepMove ? prev!.moveWindows : [{ date: WEEK[5], start: 600, end: 600 + length }],
    } as Commitment;
  });
}
