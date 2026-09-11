import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Commitment, Dimension, WEEK, time, weekdayOf, weekly } from './model';
import { C, Chip, Group, Icon, Row, Sheet, Txt } from './ui';

/** Anything that happens at a set time on chosen days: a study window, a class, sleep. */
export interface Routine { name: string; start: number; end: number; days: string[]; kind: Commitment['kind']; dimension: Dimension }

const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
/** "Every day", "Weekdays", or "Mon, Wed". */
export function daysLabel(days: string[]): string {
  // Routines repeat weekly, so a day counts if any of its weeks is chosen.
  const sorted = WEEK.filter(d => days.some(x => weekdayOf(x) === weekdayOf(d)));
  if (sorted.length === 7) return 'Every day';
  if (sorted.length === 5 && sorted.every(d => WEEK.indexOf(d) < 5)) return 'Weekdays';
  if (sorted.length === 2 && sorted.every(d => WEEK.indexOf(d) >= 5)) return 'Weekends';
  return sorted.map(weekday).join(', ');
}

// ---------- the clock wheel ----------

const ITEM = 44;
const pad = (n: number) => String(n).padStart(2, '0');

function Wheel({ values, value, onChange, label }: { values: number[]; value: number; onChange: (v: number) => void; label: string }) {
  const ref = useRef<ScrollView>(null);
  const index = Math.max(0, values.indexOf(value));
  const [shown, setShown] = useState(index);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM, animated: false }), 0);
    return () => { clearTimeout(t); if (timer.current) clearTimeout(timer.current); };
  }, []);
  // Settle on the nearest number once scrolling pauses; works the same on phones and the web.
  const settle = (y: number) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM)));
    setShown(i);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      ref.current?.scrollTo({ y: i * ITEM, animated: true });
      if (values[i] !== value) onChange(values[i]);
    }, 140);
  };
  const pick = (i: number) => { setShown(i); ref.current?.scrollTo({ y: i * ITEM, animated: true }); onChange(values[i]); };
  return <View style={{ width: 80, height: ITEM * 5 }}>
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ITEM * 2, height: ITEM, borderRadius: 12, backgroundColor: C.sage }} />
    <ScrollView ref={ref} showsVerticalScrollIndicator={false} snapToInterval={ITEM} decelerationRate="fast" scrollEventThrottle={16} nestedScrollEnabled
      onScroll={e => settle(e.nativeEvent.contentOffset.y)} contentContainerStyle={{ paddingVertical: ITEM * 2 }}>
      {values.map((v, i) => {
        const distance = Math.abs(i - shown);
        return <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: distance === 0 }} accessibilityLabel={`${label} ${pad(v)}`} onPress={() => pick(i)}
          style={{ height: ITEM, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontSize: distance === 0 ? 28 : 22, lineHeight: 34, fontWeight: distance === 0 ? '700' : '400', color: distance === 0 ? C.ink : C.muted, opacity: distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3 }}>{pad(v)}</Txt>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}

const HOURS = Array.from({ length: 25 }, (_, h) => h);
const MINUTES = [0, 15, 30, 45];

/** Hours and minutes side by side, like a clock app. Quarter-hour steps match the planner. */
export function TimeWheel({ value, onChange, label }: { value: number; onChange: (m: number) => void; label: string }) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  const column = (title: string, wheel: React.ReactNode) => <View style={{ alignItems: 'center', gap: 4 }}><Txt muted style={{ fontSize: 12, fontWeight: '700' }}>{title}</Txt>{wheel}</View>;
  return <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28, paddingVertical: 8 }}>
    {column('H', <Wheel label={`${label} hour`} values={HOURS} value={h} onChange={nh => onChange(Math.min(1440, nh * 60 + (nh === 24 ? 0 : m)))} />)}
    {column('M', <Wheel label={`${label} minute`} values={MINUTES} value={m} onChange={nm => onChange(Math.min(1440, h * 60 + nm))} />)}
  </View>;
}

/** Seven round day buttons, as in an alarm's repeat setting. */
export function DaysPicker({ days, onChange }: { days: string[]; onChange: (days: string[]) => void }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
    {WEEK.map(date => {
      // A weekday is on if any week of it is chosen; turning it off removes it from every week.
      const on = days.some(d => weekdayOf(d) === weekdayOf(date));
      return <Pressable key={date} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={weekday(date)}
        onPress={() => onChange(on ? days.filter(d => weekdayOf(d) !== weekdayOf(date)) : [...days, date])}
        style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.green : C.sage }}>
        <Txt style={{ fontSize: 14, fontWeight: '700', color: on ? C.white : C.green }}>{weekday(date).slice(0, 1)}</Txt>
      </Pressable>;
    })}
  </View>;
}

const KINDS: { id: Commitment['kind']; title: string; sub: string }[] = [
  { id: 'fixed', title: 'Fixed', sub: 'Classes, work shifts. Never moved.' },
  { id: 'flexible', title: 'Flexible', sub: 'Gym, errands. May move to make room.' },
  { id: 'recovery', title: 'Rest', sub: 'Sleep, downtime. Never used for study.' },
];
const AREAS: [Dimension, string][] = [['mental', 'Mental'], ['physical', 'Physical'], ['social', 'Social'], ['errands', 'Errands']];

/** One editor for study time and events, used by weekly setup and the calendar alike. */
export function RoutineEditor({ heading, study = false, kinds = ['fixed', 'flexible', 'recovery'], initial, onSave, onDelete, onClose }: {
  heading: string; study?: boolean; kinds?: Commitment['kind'][]; initial: Routine; onSave: (r: Routine) => void; onDelete?: () => void; onClose: () => void;
}) {
  const [r, setR] = useState<Routine>(initial);
  const [open, setOpen] = useState<'start' | 'end' | null>('start');
  const [error, setError] = useState('');
  const set = (patch: Partial<Routine>) => { setR(prev => ({ ...prev, ...patch })); setError(''); };
  const save = () => {
    if (!study && !r.name.trim()) return setError('Add a name.');
    if (r.end <= r.start) return setError('End after it starts.');
    if (!r.days.length) return setError('Pick at least one day.');
    onSave({ ...r, name: r.name.trim() });
  };

  return <Sheet title={heading} onClose={onClose} onSave={save}>
    {!study && <TextInput accessibilityLabel="Name" autoFocus={!initial.name} value={r.name} onChangeText={name => set({ name })} placeholder="Name" placeholderTextColor={C.muted}
      style={{ fontSize: 18, color: C.ink, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line }} />}
    {error !== '' && <Txt style={{ color: C.red, fontSize: 14 }}>{error}</Txt>}

    <Group>
      <Row label="Starts" value={time(r.start)} onPress={() => setOpen(open === 'start' ? null : 'start')} />
      {open === 'start' && <TimeWheel label="Start" value={r.start} onChange={start => set({ start })} />}
      <Row label="Ends" value={time(r.end)} onPress={() => setOpen(open === 'end' ? null : 'end')} />
      {open === 'end' && <TimeWheel label="End" value={r.end} onChange={end => set({ end })} />}
    </Group>

    <Group>
      <Row label="Repeat" value={r.days.length ? daysLabel(r.days) : 'Never'} />
      <DaysPicker days={r.days} onChange={days => set({ days })} />
    </Group>

    {!study && kinds.length > 1 && <Group title="Type">
      {KINDS.filter(k => kinds.includes(k.id)).map(k => <Row key={k.id} label={k.title} sub={k.sub} onPress={() => set({ kind: k.id })}
        right={<View style={{ width: 22 }}>{r.kind === k.id && <Icon name="check" size={22} />}</View>} />)}
    </Group>}

    {!study && r.kind !== 'recovery' && <View style={{ gap: 8 }}>
      <Txt style={{ fontSize: 13, fontWeight: '700', color: C.muted, paddingHorizontal: 4 }}>Area</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{AREAS.map(([id, label]) => <Chip key={id} active={r.dimension === id} onPress={() => set({ dimension: id })}>{label}</Chip>)}</View>
    </View>}

    {onDelete && <Group><Row label="Delete" danger onPress={onDelete} /></Group>}
  </Sheet>;
}

// ---------- routines ↔ commitments ----------

/** Commitments with the same name, time and type are one repeating routine. */
export function groupCommitments(all: Commitment[]): Commitment[][] {
  const groups = new Map<string, Commitment[]>();
  for (const c of all) {
    const key = `${c.title}|${c.start}|${c.end}|${c.kind}`;
    groups.set(key, [...(groups.get(key) || []), c]);
  }
  return [...groups.values()].sort((a, b) => a[0].start - b[0].start);
}
export const routineOf = (group: Commitment[]): Routine =>
  ({ name: group[0].title, start: group[0].start, end: group[0].end, days: group.map(c => c.date), kind: group[0].kind, dimension: group[0].dimension });

/** The commitments a routine becomes: one per chosen day, keeping ids for days that already existed. */
export function commitmentsFor(old: Commitment[], r: Routine): Commitment[] {
  const base = old[0]?.id ?? `event-${Date.now()}`;
  const length = r.end - r.start;
  // Rest repeats every week of the plan; other events keep exactly the days chosen.
  const weekdays = WEEK.filter(d => r.days.some(x => weekdayOf(x) === weekdayOf(d)));
  const dates = r.kind === 'recovery' ? weekdays.flatMap(weekly) : [...new Set(r.days)].sort();
  return dates.map(date => {
    const prev = old.find(o => o.date === date) ?? old[0];
    const keepMove = r.kind === 'flexible' && prev?.moveWindows?.length && prev.moveWindows[0].end - prev.moveWindows[0].start === length;
    return {
      ...(prev ?? {}),
      id: old.find(o => o.date === date)?.id ?? `${base}-${date}`,
      title: r.name, date, start: r.start, end: r.end, kind: r.kind,
      dimension: r.kind === 'recovery' ? 'physical' : r.dimension,
      demand: r.kind === 'recovery' ? 'low' : prev?.demand ?? 'medium',
      // A plan may only move a flexible event into a slot it is allowed to use.
      moveWindows: r.kind !== 'flexible' ? undefined : keepMove ? prev!.moveWindows : [{ date: WEEK[5], start: 600, end: 600 + length }],
    } as Commitment;
  });
}
