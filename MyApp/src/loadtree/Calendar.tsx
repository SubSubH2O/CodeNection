import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';
import { AppState, Block, Candidate, Commitment, dateLabel, overlaps, stamp, time, Window } from './model';
import { C, DIM_TONE, Icon, S, TONE, Txt } from './ui';
import { dayLoad } from './load';
import { gridDays } from './calendarDates';
import { PixelLeaf } from './Pixel';

import { slotKey as key, PlanChanges } from './planChanges';
export { planChanges, changesOn } from './planChanges';

// ---------- month ----------

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** A round step-back / step-forward arrow, shared by the week strip and the month grid. */
function StepArrow({ dir, label, onStep }: { dir: 1 | -1; label: string; onStep: (d: 1 | -1) => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={dir === -1 ? `Previous ${label}` : `Next ${label}`} onPress={() => onStep(dir)} hitSlop={4}
      style={({ pressed }) => ({ width: 32, height: 44, borderRadius: 16, backgroundColor: pressed ? C.sage : 'transparent', alignItems: 'center', justifyContent: 'center', transform: dir === 1 ? [{ rotate: '180deg' }] : [] })}>
      <Icon name="back" size={18} />
    </Pressable>
  );
}

/** Month header: step back, the month's name, step forward. */
function CalendarNav({ label, onStep, center }: { label: string; onStep: (d: 1 | -1) => void; center: string }) {
  return (
    <View style={[S.between, { paddingBottom: 2 }]}>
      <StepArrow dir={-1} label={label} onStep={onStep} />
      <Txt style={{ fontSize: 14, fontWeight: '700' }}>{center}</Txt>
      <StepArrow dir={1} label={label} onStep={onStep} />
    </View>
  );
}

export function MonthGrid({ state, selected, onSelect, changes }: { state: AppState; selected: string; onSelect: (day: string) => void; changes: PlanChanges }) {
  const month = selected.slice(0, 7);
  const deadlines = new Set(state.tasks.filter(t => t.steps.some(s => s.remaining > 0)).map(t => t.deadline.slice(0, 10)));
  const days = gridDays(selected);
  return (
    <View style={{ gap: 6 }}>
      <CalendarNav label="month" center={new Date(`${month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} onStep={dir => {
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
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? C.green : 'transparent', borderWidth: preview && !isSelected ? 2 : 0, borderColor: C.flag }}>
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
        <Txt style={{ fontSize: 12, color: C.flag }}>● Proposed</Txt>
        <Txt style={{ fontSize: 12, color: C.calm }}>● Deadline</Txt>
      </View>
    </View>
  );
}

// ---------- month, as scrollable rows ----------

/** The month as week rows, so the selected day's row can stay pinned while the schedule scrolls. */
export const monthWeeks = (selected: string): string[][] => {
  const days = gridDays(selected);
  return Array.from({ length: days.length / 7 }, (_, r) => days.slice(r * 7, r * 7 + 7));
};

/** Month name with arrows, then the weekday initials. */
export function MonthHeader({ selected, onSelect }: { selected: string; onSelect: (day: string) => void }) {
  const month = selected.slice(0, 7);
  return (
    <View style={{ gap: 4, paddingBottom: 2 }}>
      <CalendarNav label="month" center={new Date(`${month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} onStep={dir => {
        const d = new Date(`${month}-01T12:00:00Z`);
        d.setUTCMonth(d.getUTCMonth() + dir);
        onSelect(d.toISOString().slice(0, 10));
      }} />
      <View style={{ flexDirection: 'row' }}>
        {DAY_INITIALS.map((d, i) => <View key={i} style={{ flex: 1, alignItems: 'center' }}><Txt muted style={{ fontSize: 12, fontWeight: '600' }}>{d}</Txt></View>)}
      </View>
    </View>
  );
}

/** One week of the month. It has its own background so it can sit pinned over the schedule. */
export function MonthWeek({ state, week, selected, onSelect, changes }: { state: AppState; week: string[]; selected: string; onSelect: (day: string) => void; changes: PlanChanges }) {
  const month = selected.slice(0, 7);
  const deadlines = new Set(state.tasks.filter(t => t.steps.some(s => s.remaining > 0)).map(t => t.deadline.slice(0, 10)));
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.paper }}>
      {week.map(day => {
        const outside = day.slice(0, 7) !== month;
        const isSelected = day === selected;
        const preview = changes.days.has(day);
        const deadline = deadlines.has(day);
        return (
          <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${dateLabel(day, true)}${preview ? ', has proposed changes' : ''}${deadline ? ', deadline' : ''}`}
            onPress={() => onSelect(day)} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? C.green : 'transparent', borderWidth: preview && !isSelected ? 2 : 0, borderColor: C.flag }}>
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
  const step = (dir: 1 | -1) => {
    const d = new Date(`${selected}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dir * 7);
    onSelect(d.toISOString().slice(0, 10));
  };
  // One row: arrows either side of the seven days, so the schedule starts higher on the screen.
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <StepArrow dir={-1} label="week" onStep={step} />
      <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
      {days.map((day, i) => {
        const isSelected = day === selected;
        const preview = changes.days.has(day);
        const deadline = deadlines.has(day);
        return (
          <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${dateLabel(day, true)}${preview ? ', has proposed changes' : ''}${deadline ? ', deadline' : ''}`}
            onPress={() => onSelect(day)}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center', gap: 3, backgroundColor: isSelected ? C.green : 'transparent' }}>
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
      <StepArrow dir={1} label="week" onStep={step} />
    </View>
  );
}

// ---------- week ----------

/** The week at a glance: each day's load and what is on it. Tapping a day opens it. */
export function WeekAgenda({ state, selected, plan, onDay, onWeek }: { state: AppState; selected: string; plan?: Candidate | null; onDay: (day: string) => void; onWeek: (dir: 1 | -1) => void }) {
  const start = new Date(`${selected}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  const short = (d: string, month: boolean) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', month ? { day: 'numeric', month: 'short' } : { day: 'numeric' });
  return (
    <View>
      {/* Previous / next week, with the dates in between. */}
      <View style={[S.between, { paddingBottom: 2 }]}>
        <StepArrow dir={-1} label="week" onStep={onWeek} />
        <Txt style={{ fontSize: 14, fontWeight: '700' }}>{short(days[0], days[0].slice(5, 7) !== days[6].slice(5, 7))} – {short(days[6], true)}</Txt>
        <StepArrow dir={1} label="week" onStep={onWeek} />
      </View>
      {days.map(day => {
        const rows = buildRows(state, day, plan).filter(r => r.status !== 'ghost' && r.look !== 'recovery');
        const load = dayLoad(state, day, plan);
        const today = day === state.now.slice(0, 10);
        return (
          <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${dateLabel(day, true)}, load ${load.score} percent, ${rows.length} items`} onPress={() => onDay(day)}
            style={({ pressed }) => ({ paddingVertical: 12, gap: 7, borderBottomWidth: 1, borderColor: C.line, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Txt style={{ width: 64, fontSize: 15, fontWeight: '800', color: today ? C.green : C.ink }}>{new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</Txt>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.track }}>
                <View style={{ width: `${Math.max(2, load.score)}%`, height: 6, borderRadius: 3, backgroundColor: TONE[load.tone] }} />
              </View>
              <Txt muted style={{ width: 40, textAlign: 'right', fontSize: 12.5 }}>{load.score}%</Txt>
            </View>
            {rows.length ? rows.map(row => {
              const proposed = row.status === 'new' || row.status === 'moved';
              const tint = proposed ? C.flag : row.look === 'study' ? DIM_TONE.study.fg : (DIM_TONE[row.dim || 'errands'] ?? DIM_TONE.errands).fg;
              return <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 74 }}>
                <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: tint }} />
                <Txt numberOfLines={1} style={{ flex: 1, fontSize: 13 }}><Txt muted style={{ fontSize: 13 }}>{span(row.start, row.end)}  </Txt>{row.title}{proposed ? ' · proposed' : ''}</Txt>
              </View>;
            }) : <Txt muted style={{ paddingLeft: 74, fontSize: 13 }}>Free</Txt>}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- day ----------

const HOUR = 60;
const GUTTER = 50;

const hourLabel = (h: number) => (h % 24 === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
const clock = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}${m % 60 ? `:${String(m % 60).padStart(2, '0')}` : ''}`;
const meridiem = (m: number) => (Math.floor(m / 60) % 24 < 12 ? 'AM' : 'PM');
const span = (s: number, e: number) => (meridiem(s) === meridiem(e) ? `${clock(s)} – ${clock(e)} ${meridiem(e)}` : `${clock(s)} ${meridiem(s)} – ${clock(e)} ${meridiem(e)}`);

/** "↓ moved to 6 PM" on the same day, "→ moved to Thu 4 PM" to another. */
const movedTo = (to: Window, from: string) => `${to.date === from ? '↓' : '→'} moved to ${to.date === from ? '' : `${new Date(`${to.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })} `}${clock(to.start)} ${meridiem(to.start)}`;
const minutesLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`);

type Row = { id: string; title: string; start: number; end: number; look: 'commitment' | 'recovery' | 'study'; status: 'saved' | 'new' | 'moved' | 'ghost'; note?: string; taskId?: string; steps?: number; done?: number; ids?: string[]; destination?: Block | Commitment; conflict?: boolean; lane: number; lanes: number; dim?: string; stepTitles?: string[] };

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
      status: movedHere ? 'moved' : !before && plan ? 'new' : 'saved',
      note: movedHere && before ? `from ${before.date === c.date ? '' : `${dateLabel(before.date)}, `}${clock(before.start)} ${meridiem(before.start)}` : undefined,
      lane: 0, lanes: 1, dim: c.dimension,
    });
  }
  for (const b of blocks.filter(b => b.date === date)) {
    const owner = tasks.find(t => t.id === b.taskId);
    rows.push({
      id: b.id, title: owner?.title ?? b.title, start: b.start, end: b.end, look: 'study',
      // Which step of the task this is, so the calendar speaks in subtasks, not just task names.
      stepTitles: [owner?.steps.find(s => s.id === b.stepId)?.title ?? b.title],
      status: !plan || saved.has(key(b)) ? 'saved' : state.blocks.some(old => old.taskId === b.taskId && old.stepId === b.stepId) ? 'moved' : 'new',
      taskId: b.taskId, steps: owner?.steps.length, done: owner?.steps.filter(s => s.remaining === 0).length, ids: [b.id], lane: 0, lanes: 1,
    });
  }
  if (plan) {
    for (const before of state.commitments) {
      const after = plan.commitments.find(c => c.id === before.id);
      if (!after || before.date !== date) continue;
      if (after.date === before.date && after.start === before.start) continue;
      rows.push({ id: `ghost-${before.id}`, title: before.title, start: before.start, end: before.end, look: 'commitment', status: 'ghost', destination: after, note: movedTo(after, date), lane: 0, lanes: 1 });
    }
    for (const before of state.blocks) {
      if (before.date !== date || stamp(before) < state.now) continue;
      if (plan.blocks.some(b => key(b) === key(before))) continue;
      const destination = plan.blocks.filter(b => b.taskId === before.taskId && b.stepId === before.stepId).sort((a, b) => stamp(a).localeCompare(stamp(b)))[0];
      // Carries the task id so the old position of a whole session reads as one faint block.
      rows.push({ id: `ghost-${before.id}`, title: state.tasks.find(t => t.id === before.taskId)?.title ?? before.title, start: before.start, end: before.end, look: 'study', status: 'ghost', taskId: before.taskId, destination, note: destination ? movedTo(destination, date) : 'Not scheduled', lane: 0, lanes: 1 });
    }
  }
  rows.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

  // Four 15-minute steps in a row is one hour of one task, not four blocks.
  // Merging them is both truer to the day and the only way they stay readable.
  const merged: Row[] = [];
  for (const row of rows) {
    const prev = [...merged].reverse().find(r => r.look === 'study' && r.taskId === row.taskId && r.status === row.status && r.end === row.start);
    const joinable = prev && prev.look === 'study' && row.look === 'study'
      && prev.taskId && prev.taskId === row.taskId
      && prev.status === row.status && prev.end === row.start;
    if (joinable) {
      prev.end = row.end;
      prev.ids = [...(prev.ids || []), ...(row.ids || [])];
      prev.stepTitles = [...new Set([...(prev.stepTitles || []), ...(row.stepTitles || [])])];
      continue;
    }
    merged.push({ ...row });
  }

  rows = merged;
  rows.forEach(row => { row.conflict = row.status !== 'ghost' && rows.some(other => other !== row && other.status !== 'ghost' && row.start < other.end && other.start < row.end); });


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

function TimelineItem({ children, style, quiet, reduceMotion, flash, appearance }: { children: React.ReactNode; style: ViewStyle & { top: number; height: number }; quiet: boolean; reduceMotion: boolean; flash: number; appearance: string }) {
  const y = useRef(new Animated.Value(style.top)).current;
  const h = useRef(new Animated.Value(style.height)).current;
  const x = useRef(new Animated.Value(parseFloat(String(style.left)))).current;
  const w = useRef(new Animated.Value(parseFloat(String(style.width)))).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const drop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const targets: [Animated.Value, number][] = [[y, style.top], [h, style.height], [x, parseFloat(String(style.left))], [w, parseFloat(String(style.width))]];
    targets.forEach(([value, toValue]) => { value.stopAnimation(); if (quiet || reduceMotion) value.setValue(toValue); else Animated.spring(value, { toValue, useNativeDriver: false, damping: 24, stiffness: 220, mass: 1 }).start(); });
    return () => targets.forEach(([value]) => value.stopAnimation());
  }, [style.top, style.height, style.left, style.width, quiet, reduceMotion]);
  useEffect(() => {
    opacity.stopAnimation(); drop.stopAnimation(); opacity.setValue(1); drop.setValue(0);
    if (quiet || reduceMotion || (!flash && !appearance)) return;
    drop.setValue(appearance ? -22 : 0);
    const animation = Animated.parallel([
      Animated.spring(drop, { toValue: 0, useNativeDriver: false, damping: 18, stiffness: 200, mass: 0.8 }),
      Animated.sequence([Animated.timing(opacity, { toValue: 0.4, duration: 150, useNativeDriver: false }), Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: false })]),
    ]);
    animation.start(); return () => animation.stop();
  }, [flash, appearance, quiet, reduceMotion]);
  return <Animated.View style={[style, { top: y, height: h, left: x.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), transform: [{ translateY: drop }], opacity: Animated.multiply(opacity, Number(style.opacity ?? 1)), overflow: 'hidden' }]}>{children}</Animated.View>;
}

export function DayTimeline({ state, date, plan, onTask, onSlot, onEvent, reduceMotion = false, focus, onJump }: { state: AppState; date: string; plan?: Candidate | null; onTask?: (id: string) => void; onSlot?: (startMinutes: number) => void; onEvent?: (id: string) => void; reduceMotion?: boolean; focus?: { blockId?: string; nonce: number } | null; onJump?: (block: Block | Commitment) => void }) {
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
        {rows.map((row, rowIndex) => {
          const ghost = row.status === 'ghost';
          const proposed = row.status === 'new' || row.status === 'moved';
          const top = ((row.start - from * 60) / 60) * HOUR;
          const box = Math.max(((row.end - row.start) / 60) * HOUR - 3, 26);
          const onDark = false;
          const tone = row.look === 'recovery' ? DIM_TONE.recovery : row.look === 'study' ? DIM_TONE.study : DIM_TONE[row.dim || 'errands'] ?? DIM_TONE.errands;
          const body = (
            <View style={{ flex: 1, gap: 1, justifyContent: box > 60 ? 'flex-start' : 'center', paddingTop: box > 60 ? 3 : 0, overflow: 'hidden' }}>
              {row.conflict && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}><Svg width="100%" height="100%"><Defs><Pattern id={`hatch-${rowIndex}`} patternUnits="userSpaceOnUse" width={10} height={10}><Path d="M-2 2L2 -2M0 10L10 0M8 12L12 8" stroke={C.red} strokeWidth={2} opacity={0.2} /></Pattern></Defs><Rect width="100%" height="100%" fill={`url(#hatch-${rowIndex})`} /></Svg></View>}
              <View style={[S.between, { gap: 6 }]}>
                {row.conflict && <Txt accessibilityLabel="Scheduling conflict" style={{ fontWeight: '800', color: C.red }}>!</Txt>}
                {row.look === 'study' && !ghost && <PixelLeaf size={11} color={proposed ? C.flag : tone.fg} />}
                <Txt numberOfLines={1} style={{ flex: 1, fontSize: 13.5, lineHeight: 17, fontWeight: '700', color: onDark ? C.white : ghost ? C.muted : C.ink }}>
                  {row.title}{ghost && <Txt style={{ fontSize: 12.5, fontWeight: '400', color: C.muted }}> (previously here)</Txt>}
                </Txt>
                {proposed && box > 30 && <View style={{ backgroundColor: C.flag, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}><Txt style={{ fontSize: 10.5, lineHeight: 14, fontWeight: '800', color: C.white }}>Proposed</Txt></View>}
                {row.look === 'recovery' && <Icon name="lock" size={14} color={C.teal} />}
              </View>
              {/* The step being worked on, so the calendar and the task breakdown tell the same story. */}
              {row.look === 'study' && !ghost && box > 50 && !!row.stepTitles?.length && <Txt numberOfLines={1} style={{ fontSize: 12, lineHeight: 15, color: C.ink }}>
                {row.stepTitles[0]}{row.stepTitles.length > 1 ? ` +${row.stepTitles.length - 1} more` : ''} · {minutesLabel(row.end - row.start)}
              </Txt>}
              {box > 38 && <Txt numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 15, color: onDark ? '#DCEBDF' : C.muted }}>{span(row.start, row.end)}</Txt>}
              {box > 50 && row.note && <Txt numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, color: onDark ? '#DCEBDF' : proposed ? C.flag : C.muted }}>{row.note}</Txt>}
              {row.steps && !ghost && box > 84 ? <View accessibilityLabel={`${row.done || 0} of ${row.steps} subtasks complete`} style={{ flexDirection: 'row', gap: 3, marginTop: 2 }}>{Array.from({ length: row.steps }, (_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < (row.done || 0) ? C.green : '#B7CEC1' }} />)}</View> : null}
            </View>
          );
          const style = {
            position: 'absolute' as const,
            top,
            height: box,
            left: `${(row.lane / row.lanes) * 100}%` as const,
            width: `${(1 / row.lanes) * 100}%` as const,
            paddingHorizontal: 11,
            paddingVertical: box <= 38 ? 2 : 6,
            borderRadius: 14,
            // Saved items: a soft tint with a colour edge for their part of life. Proposals: dashed lavender.
            borderWidth: proposed || ghost || row.conflict ? 1.6 : 0,
            borderLeftWidth: proposed || ghost || row.conflict ? 1.6 : 4,
            borderStyle: (proposed || ghost ? 'dashed' : 'solid') as 'dashed' | 'solid',
            borderColor: row.conflict ? C.red : proposed ? C.flag : ghost ? C.muted : tone.fg,
            borderLeftColor: row.conflict ? C.red : proposed ? C.flag : ghost ? C.muted : tone.fg,
            backgroundColor: row.conflict ? C.redBg : ghost ? C.paper : proposed ? C.flagBg : tone.bg,
            opacity: ghost ? 0.5 : stamp({ date, start: row.start, end: row.end }, true) <= state.now ? 0.55 : 1,
          };
          const action = ghost && row.destination && onJump ? () => onJump(row.destination!) : !plan && row.taskId && onTask ? () => onTask(row.taskId!) : !plan && onEvent && row.look !== 'study' ? () => onEvent(row.id) : undefined;
          const identity = !ghost && row.taskId ? `${row.taskId}-${rows.slice(0, rowIndex).filter(r => r.taskId === row.taskId && r.status !== 'ghost').length}` : row.id;
          return <TimelineItem key={identity} style={style} quiet={row.look === 'recovery'} reduceMotion={reduceMotion} flash={focus?.blockId && (row.ids || [row.id]).includes(focus.blockId) ? focus.nonce : 0} appearance={row.status === 'new' ? `${plan?.id}-${date}` : ''}>
            {action ? <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}, ${span(row.start, row.end)}${ghost ? `, ${row.note}` : ''}`} onPress={action} style={{ flex: 1 }}>{body}</Pressable> : body}
          </TimelineItem>;
        })}
      </View>
    </View>
  );
}
