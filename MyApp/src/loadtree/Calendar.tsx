import React from 'react';
import { Pressable, View } from 'react-native';
import { AppState, Block, Candidate, Commitment, dateLabel, stamp, time } from './model';
import { C, Icon, S, Txt } from './ui';
import { gridDays } from './calendarDates';

const key = (item: { id: string; date: string; start: number; end: number }) => `${item.id}|${item.date}|${item.start}|${item.end}`;

export interface PlanChanges { added: Block[]; removed: Block[]; moved: { now: Commitment; before: Commitment }[]; total: number; days: Set<string> }

export function planChanges(state: AppState, plan?: Candidate | null): PlanChanges {
  const empty: PlanChanges = { added: [], removed: [], moved: [], total: 0, days: new Set() };
  if (!plan) return empty;
  const saved = new Set([...state.commitments, ...state.blocks].map(key));
  const added = plan.blocks.filter(b => !saved.has(key(b)) && stamp(b) >= state.now);
  const moved = plan.commitments
    .map(now => ({ now, before: state.commitments.find(c => c.id === now.id)! }))
    .filter(pair => pair.before && (pair.before.date !== pair.now.date || pair.before.start !== pair.now.start));
  // Work lifted off a day is a change the student needs to see, even though it
  // is the same change as the block that appears elsewhere — so flag the day
  // without counting it twice.
  const removed = state.blocks.filter(b => stamp(b) >= state.now && !plan.blocks.some(p => p.id === b.id));
  const days = new Set<string>([...added.map(b => b.date), ...removed.map(b => b.date), ...moved.flatMap(m => [m.now.date, m.before.date])]);
  return { added, removed, moved, total: added.length + moved.length, days };
}

export const changesOn = (changes: PlanChanges, date: string) =>
  changes.added.filter(b => b.date === date).length
  + changes.removed.filter(b => b.date === date).length
  + changes.moved.filter(m => m.now.date === date || m.before.date === date).length;

// ---------- month ----------

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The same header for both calendar modes: step back, jump home, step forward. */
function CalendarNav({ label, onStep, onToday }: { label: string; onStep: (d: 1 | -1) => void; onToday: () => void }) {
  const arrow = (dir: 1 | -1) => (
    <Pressable accessibilityRole="button" accessibilityLabel={dir === -1 ? `Previous ${label}` : `Next ${label}`} onPress={() => onStep(dir)}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: pressed ? C.sage : C.white, alignItems: 'center', justifyContent: 'center', transform: dir === 1 ? [{ rotate: '180deg' }] : [] })}>
      <Icon name="back" size={18} />
    </Pressable>
  );
  return (
    <View style={[S.between, { paddingBottom: 4 }]}>
      {arrow(-1)}
      <Pressable accessibilityRole="button" accessibilityLabel="Go to the current day" onPress={onToday} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
        <Txt style={{ fontSize: 12, color: C.green, fontWeight: '600' }}>Back to this week</Txt>
      </Pressable>
      {arrow(1)}
    </View>
  );
}

export function MonthGrid({ state, selected, onSelect, changes }: { state: AppState; selected: string; onSelect: (day: string) => void; changes: PlanChanges }) {
  const month = selected.slice(0, 7);
  const deadlines = new Set(state.tasks.filter(t => t.steps.some(s => s.remaining > 0)).map(t => t.deadline.slice(0, 10)));
  const days = gridDays(selected);
  return (
    <View style={{ gap: 6, backgroundColor: '#EAF4EE', borderRadius: 26, padding: 10 }}>
      <CalendarNav label="month" onToday={() => onSelect(state.now.slice(0, 10))} onStep={dir => {
        const d = new Date(`${month}-01T12:00:00Z`);
        d.setUTCMonth(d.getUTCMonth() + dir);
        onSelect(d.toISOString().slice(0, 10));
      }} />
      <View style={{ flexDirection: 'row' }}>
        {DAY_INITIALS.map((d, i) => <View key={i} style={{ flex: 1, alignItems: 'center' }}><Txt muted style={{ fontSize: 12, fontWeight: '600' }}>{d}</Txt></View>)}
      </View>
      {Array.from({ length: days.length / 7 }, (_, row) => row).map(row => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {days.slice(row * 7, row * 7 + 7).map(day => {
            const outside = day.slice(0, 7) !== month;
            const isSelected = day === selected;
            const preview = changes.days.has(day);
            const deadline = deadlines.has(day);
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${dateLabel(day, true)}${preview ? ', has proposed changes' : ''}${deadline ? ', deadline' : ''}`}
                onPress={() => onSelect(day)}
                style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', gap: 3 }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? C.green : outside ? 'transparent' : '#F7FAF8', borderWidth: isSelected || preview ? 2 : 1, borderColor: isSelected ? '#A5D6C2' : preview ? C.flag : '#DCE8E0' }}>
                  <Txt style={{ fontSize: 15, fontWeight: isSelected ? '700' : '500', color: isSelected ? C.white : outside ? '#AEB8B0' : C.ink }}>{Number(day.slice(-2))}</Txt>
                </View>
                <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>
                  {preview && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.flag }} />}
                  {deadline && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.calm }} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, paddingTop: 2 }}>
        <Txt muted style={{ fontSize: 12 }}>Amber = proposed</Txt>
        <Txt muted style={{ fontSize: 12 }}>Green = deadline</Txt>
      </View>
    </View>
  );
}

/** Seven days that stay beside the schedule, so picking a day needs no scrolling. */
export function WeekStrip({ state, selected, onSelect, changes }: { state: AppState; selected: string; onSelect: (day: string) => void; changes: PlanChanges }) {
  const deadlines = new Set(state.tasks.filter(t => t.steps.some(x => x.remaining > 0)).map(t => t.deadline.slice(0, 10)));
  const start = new Date(`${selected}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return (
    <View style={{ gap: 6, backgroundColor: '#EAF4EE', borderRadius: 26, padding: 10 }}>
      <CalendarNav label="week" onToday={() => onSelect(state.now.slice(0, 10))} onStep={dir => {
        const d = new Date(`${selected}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + dir * 7);
        onSelect(d.toISOString().slice(0, 10));
      }} />
      <View style={{ flexDirection: 'row', gap: 5 }}>
      {days.map((day, i) => {
        const isSelected = day === selected;
        const preview = changes.days.has(day);
        const deadline = deadlines.has(day);
        return (
          <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${dateLabel(day, true)}${preview ? ', has proposed changes' : ''}${deadline ? ', deadline' : ''}`}
            onPress={() => onSelect(day)}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center', gap: 3, backgroundColor: isSelected ? C.green : C.white, borderWidth: 1, borderColor: isSelected ? C.green : C.line }}>
            <Txt style={{ fontSize: 10.5, fontWeight: '600', color: isSelected ? '#BBD8C7' : C.muted }}>{DAY_INITIALS[i]}</Txt>
            <Txt style={{ fontSize: 15, fontWeight: '700', color: isSelected ? C.white : C.ink }}>{Number(day.slice(-2))}</Txt>
            <View style={{ flexDirection: 'row', gap: 2, height: 5 }}>
              {preview && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isSelected ? C.white : C.flag }} />}
              {deadline && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isSelected ? C.white : C.calm }} />}
            </View>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

// ---------- day ----------

const HOUR = 60;
const GUTTER = 50;

const hourLabel = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
const clock = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}${m % 60 ? `:${String(m % 60).padStart(2, '0')}` : ''}`;
const meridiem = (m: number) => (Math.floor(m / 60) < 12 ? 'AM' : 'PM');
const span = (s: number, e: number) => (meridiem(s) === meridiem(e) ? `${clock(s)} – ${clock(e)} ${meridiem(e)}` : `${clock(s)} ${meridiem(s)} – ${clock(e)} ${meridiem(e)}`);

type Row = { id: string; title: string; start: number; end: number; look: 'commitment' | 'recovery' | 'study'; status: 'saved' | 'new' | 'moved' | 'ghost'; note?: string; taskId?: string; steps?: number; lane: number; lanes: number };

function buildRows(state: AppState, date: string, plan?: Candidate | null): Row[] {
  const commitments = plan?.commitments || state.commitments;
  const blocks = plan?.blocks || state.blocks;
  const tasks = plan?.tasks || state.tasks;
  const saved = new Set([...state.commitments, ...state.blocks].map(key));
  let rows: Row[] = [];
  for (const c of commitments.filter(c => c.date === date)) {
    const before = state.commitments.find(x => x.id === c.id);
    const movedHere = !!plan && !!before && (before.date !== c.date || before.start !== c.start);
    rows.push({
      id: c.id, title: c.title, start: c.start, end: c.end,
      look: c.kind === 'recovery' ? 'recovery' : 'commitment',
      status: movedHere ? 'moved' : 'saved',
      note: movedHere && before ? `from ${before.date === c.date ? '' : `${dateLabel(before.date)}, `}${clock(before.start)} ${meridiem(before.start)}` : undefined,
      lane: 0, lanes: 1,
    });
  }
  for (const b of blocks.filter(b => b.date === date)) {
    const owner = tasks.find(t => t.id === b.taskId);
    rows.push({
      id: b.id, title: owner?.title ?? b.title, start: b.start, end: b.end, look: 'study',
      status: !plan || saved.has(key(b)) ? 'saved' : 'new',
      note: owner ? `${owner.steps.length} subtasks ›` : undefined,
      taskId: b.taskId, lane: 0, lanes: 1,
    });
  }
  if (plan) {
    for (const before of state.commitments) {
      const after = plan.commitments.find(c => c.id === before.id);
      if (!after || before.date !== date) continue;
      if (after.date === before.date && after.start === before.start) continue;
      rows.push({ id: `ghost-${before.id}`, title: before.title, start: before.start, end: before.end, look: 'commitment', status: 'ghost', note: `moves to ${dateLabel(after.date)} ${time(after.start)}`, lane: 0, lanes: 1 });
    }
    for (const before of state.blocks) {
      if (before.date !== date || stamp(before) < state.now) continue;
      if (plan.blocks.some(b => b.id === before.id)) continue;
      rows.push({ id: `ghost-${before.id}`, title: before.title, start: before.start, end: before.end, look: 'study', status: 'ghost', note: 'moves in this plan', lane: 0, lanes: 1 });
    }
  }
  rows.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

  // Four 15-minute steps in a row is one hour of one task, not four blocks.
  // Merging them is both truer to the day and the only way they stay readable.
  const merged: Row[] = [];
  for (const row of rows) {
    const prev = merged[merged.length - 1];
    const joinable = prev && prev.look === 'study' && row.look === 'study'
      && prev.taskId && prev.taskId === row.taskId
      && prev.status === row.status && prev.end === row.start;
    if (joinable) {
      prev.end = row.end;
      prev.steps = (prev.steps ?? 1) + 1;
      continue;
    }
    merged.push({ ...row });
  }

  rows = merged;


  // Overlapping rows share the width of their own cluster only.
  let cluster: Row[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes: Row[][] = [];
    for (const row of cluster) {
      let lane = lanes.findIndex(l => !l.some(r => r.start < row.end && row.start < r.end));
      if (lane === -1) { lanes.push([]); lane = lanes.length - 1; }
      lanes[lane].push(row);
      row.lane = lane;
    }
    cluster.forEach(r => { r.lanes = lanes.length; });
    cluster = [];
    clusterEnd = -1;
  };
  for (const row of rows) {
    if (cluster.length && row.start >= clusterEnd) flush();
    cluster.push(row);
    clusterEnd = Math.max(clusterEnd, row.end);
  }
  flush();
  return rows;
}

export function DayTimeline({ state, date, plan, onTask, onSlot, onEvent }: { state: AppState; date: string; plan?: Candidate | null; onTask?: (id: string) => void; onSlot?: (startMinutes: number) => void; onEvent?: (id: string) => void }) {
  const rows = buildRows(state, date, plan);
  const empty = rows.length === 0;
  const from = empty ? 8 : Math.min(8, Math.floor(Math.min(...rows.map(r => r.start)) / 60));
  const to = empty ? 22 : Math.max(22, Math.ceil(Math.max(...rows.map(r => r.end)) / 60));
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const height = (to - from) * HOUR;

  return (
    <View style={{ height: height + 14 }}>
      {hours.map((h, i) => (
        <View key={h} style={{ position: 'absolute', left: 0, right: 0, top: i * HOUR, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt muted style={{ width: GUTTER - 8, fontSize: 11.5, textAlign: 'right' }}>{hourLabel(h)}</Txt>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
        </View>
      ))}
      <View style={{ position: 'absolute', left: GUTTER, right: 0, top: 0, bottom: 0 }}>
        {/* One target per hour: a known start time beats reading tap coordinates,
            which are not reported consistently across platforms. */}
        {onSlot && hours.slice(0, -1).map((h, i) => (
          <Pressable
            key={`slot-${h}`}
            accessibilityRole="button"
            accessibilityLabel={`Add something at ${hourLabel(h)}`}
            onPress={() => onSlot(h * 60)}
            style={({ pressed }) => ({ position: 'absolute', left: 0, right: 0, top: i * HOUR, height: HOUR, borderRadius: 10, backgroundColor: pressed ? C.sage : 'transparent' })}
          />
        ))}
        {rows.map(row => {
          const ghost = row.status === 'ghost';
          const proposed = row.status === 'new' || row.status === 'moved';
          const top = ((row.start - from * 60) / 60) * HOUR;
          const box = Math.max(((row.end - row.start) / 60) * HOUR - 3, 26);
          const onDark = false;
          const body = (
            <View style={{ flex: 1, gap: 1, justifyContent: 'center', overflow: 'hidden' }}>
              <View style={[S.between, { gap: 6 }]}>
                <Txt numberOfLines={1} style={{ flex: 1, fontSize: 13.5, lineHeight: 17, fontWeight: '700', color: onDark ? C.white : ghost ? C.muted : C.ink, textDecorationLine: ghost ? 'line-through' : 'none' }}>{row.title}</Txt>
                {proposed && <View style={{ backgroundColor: C.flag, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}><Txt style={{ fontSize: 10.5, fontWeight: '800', color: C.white }}>{row.status === 'new' ? 'New' : 'Moved'}</Txt></View>}
                {ghost && <View style={{ borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: C.muted }}><Txt style={{ fontSize: 10.5, fontWeight: '700', color: C.muted }}>Was here</Txt></View>}
                {row.look === 'recovery' && <Icon name="lock" size={14} color={C.teal} />}
              </View>
              {box > 38 && <Txt numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 15, color: onDark ? '#DCEBDF' : C.muted }}>{span(row.start, row.end)}</Txt>}
              {box > 50 && row.note && <Txt numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, color: onDark ? '#DCEBDF' : proposed ? '#9A7223' : C.muted }}>{row.note}</Txt>}
            </View>
          );
          const style = {
            position: 'absolute' as const,
            top,
            height: box,
            left: `${(row.lane / row.lanes) * 100}%` as const,
            width: `${(1 / row.lanes) * 100}%` as const,
            paddingHorizontal: 11,
            paddingVertical: 6,
            borderRadius: 16,
            borderWidth: proposed ? 1.8 : 1,
            borderStyle: (proposed || ghost ? 'dashed' : 'solid') as 'dashed' | 'solid',
            borderColor: proposed ? C.flag : row.look === 'recovery' ? '#D3E5DC' : row.look === 'study' ? '#A4CFC0' : '#BADBCB',
            backgroundColor: proposed ? C.flagBg : row.look === 'commitment' ? '#CEE6DA' : row.look === 'recovery' ? '#EDF4EF' : '#E0F0EA',
            opacity: ghost ? 0.5 : stamp({ date, start: row.start, end: row.end }, true) <= state.now ? 0.55 : 1,
          };
          if (row.taskId && onTask && !proposed) {
            return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`${row.title}, ${span(row.start, row.end)}`} onPress={() => onTask(row.taskId!)} style={style}>{body}</Pressable>;
          }
          // Commitments you entered are yours to change — but not while previewing a proposal.
          if (!plan && !proposed && onEvent && row.look !== 'study') {
            return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Edit ${row.title}, ${span(row.start, row.end)}`} onPress={() => onEvent(row.id)} style={style}>{body}</Pressable>;
          }
          return <View key={row.id} style={style}>{body}</View>;
        })}
      </View>
    </View>
  );
}
