import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppState, Commitment, Preferences, WEEK, Window, duration, time, weekday } from './model';
import { C, Group, Icon, Row, Sheet, Txt } from './ui';
import { setupErrors } from './state';
import { DaysPicker, TimeWheel, commitmentsFor } from './RoutineEditor';

const HOUR = 56;
const FROM_HOUR = 0;  // 00:00 AM
const TO_HOUR = 24;   // 12:00 AM midnight
const TOTAL_HEIGHT = (TO_HOUR - FROM_HOUR) * HOUR;

export type BlockType = 'study' | 'free' | 'sleep';

interface VisualBlock {
  id: string;
  type: BlockType;
  title: string;
  start: number;
  end: number;
  date: string;
}

interface BlockEditorState {
  isNew: boolean;
  type: BlockType;
  start: number;
  end: number;
  days: string[];
  oldStudy?: Window[];
  oldCommitment?: Commitment[];
}

export function TimeBlocks({
  state,
  onSave,
  onClose,
}: {
  state: AppState;
  onSave: (p: Preferences, c: Commitment[]) => void;
  onClose: () => void;
}) {
  const [preferences, setPreferences] = useState<Preferences>(JSON.parse(JSON.stringify(state.preferences)));
  const [commitments, setCommitments] = useState<Commitment[]>(JSON.parse(JSON.stringify(state.commitments)));
  const [selectedDay, setSelectedDay] = useState(WEEK[0]);
  const [editing, setEditing] = useState<BlockEditorState | null>(null);
  const [openWheel, setOpenWheel] = useState<'start' | 'end' | null>('start');
  const [errors, setErrors] = useState<string[]>([]);
  const [editorError, setEditorError] = useState('');

  const set = (patch: Partial<Preferences>) => setPreferences(p => ({ ...p, ...patch }));

  const saveAll = () => {
    // Overlap is strictly not allowed between any time blocks
    const allBlocks = [
      ...preferences.availability.map(w => ({ ...w, label: 'Study Time' })),
      ...commitments.filter(c => c.kind === 'recovery').map(c => ({
        ...c,
        label: c.title.toLowerCase().includes('free') ? 'Free Time' : 'Sleep Time',
      })),
    ];
    for (let i = 0; i < allBlocks.length; i++) {
      for (let j = i + 1; j < allBlocks.length; j++) {
        const b1 = allBlocks[i];
        const b2 = allBlocks[j];
        if (b1.date === b2.date && Math.max(b1.start, b2.start) < Math.min(b1.end, b2.end)) {
          setErrors([`Time blocks cannot overlap. ${b1.label} and ${b2.label} overlap on ${weekday(b1.date)}.`]);
          return;
        }
      }
    }

    const pToSave = { ...preferences, name: preferences.name.trim() || 'You' };
    const issues = setupErrors(pToSave, commitments);
    setErrors(issues);
    if (!issues.length) onSave(pToSave, commitments);
  };

  // Extract blocks for the selected day
  const dayStudy: VisualBlock[] = preferences.availability
    .filter(w => w.date === selectedDay)
    .map(w => ({
      id: `study-${w.date}-${w.start}-${w.end}`,
      type: 'study',
      title: 'Study Time',
      start: w.start,
      end: w.end,
      date: w.date,
    }));

  const dayFree: VisualBlock[] = commitments
    .filter(c => c.date === selectedDay && c.kind === 'recovery' && c.title.toLowerCase().includes('free'))
    .map(c => ({
      id: c.id,
      type: 'free',
      title: 'Free Time',
      start: c.start,
      end: c.end,
      date: c.date,
    }));

  const daySleep: VisualBlock[] = commitments
    .filter(c => c.date === selectedDay && c.kind === 'recovery' && !c.title.toLowerCase().includes('free'))
    .map(c => ({
      id: c.id,
      type: 'sleep',
      title: 'Sleep Time',
      start: c.start,
      end: c.end,
      date: c.date,
    }));

  const dayBlocks = [...dayStudy, ...dayFree, ...daySleep].sort((a, b) => a.start - b.start);

  // Weekly stats
  const sleepMins = commitments.filter(c => c.kind === 'recovery' && !c.title.toLowerCase().includes('free')).reduce((s, c) => s + (c.end - c.start), 0);
  const freeMins = commitments.filter(c => c.kind === 'recovery' && c.title.toLowerCase().includes('free')).reduce((s, c) => s + (c.end - c.start), 0);
  const studyMins = preferences.availability.reduce((s, w) => s + (w.end - w.start), 0);
  const formatHrs = (mins: number) => `${(mins / 60).toFixed(1).replace(/\.0$/, '')}h`;

  // Tap an existing block to edit
  const onBlockPress = (b: VisualBlock) => {
    if (b.type === 'study') {
      const idx = WEEK.indexOf(b.date);
      const prevDate = WEEK[(idx + 6) % WEEK.length];
      const nextDate = WEEK[(idx + 1) % WEEK.length];

      // Check if this is part of an overnight study block
      if (b.start === 0) {
        const eve = preferences.availability.find(w => w.date === prevDate && w.end === 1440);
        if (eve) {
          const eveWindows = preferences.availability.filter(w => w.end === 1440 && w.start === eve.start);
          const mornWindows = preferences.availability.filter(w => w.start === 0 && w.end === b.end);
          setEditing({
            isNew: false,
            type: 'study',
            start: eve.start,
            end: b.end,
            days: eveWindows.map(w => w.date),
            oldStudy: [...eveWindows, ...mornWindows],
          });
          setOpenWheel('start');
          setEditorError('');
          return;
        }
      } else if (b.end === 1440) {
        const morn = preferences.availability.find(w => w.date === nextDate && w.start === 0);
        if (morn) {
          const eveWindows = preferences.availability.filter(w => w.end === 1440 && w.start === b.start);
          const mornWindows = preferences.availability.filter(w => w.start === 0 && w.end === morn.end);
          setEditing({
            isNew: false,
            type: 'study',
            start: b.start,
            end: morn.end,
            days: eveWindows.map(w => w.date),
            oldStudy: [...eveWindows, ...mornWindows],
          });
          setOpenWheel('start');
          setEditorError('');
          return;
        }
      }

      const matching = preferences.availability.filter(w => w.start === b.start && w.end === b.end);
      setEditing({
        isNew: false,
        type: 'study',
        start: b.start,
        end: b.end,
        days: matching.map(w => w.date),
        oldStudy: matching,
      });
    } else {
      const isFree = b.type === 'free';
      const isTypeMatch = (c: Commitment) =>
        c.kind === 'recovery' && (isFree ? c.title.toLowerCase().includes('free') : !c.title.toLowerCase().includes('free'));

      const idx = WEEK.indexOf(b.date);
      const prevDate = WEEK[(idx + 6) % WEEK.length];
      const nextDate = WEEK[(idx + 1) % WEEK.length];

      // Check if this is part of an overnight recovery/sleep block
      if (b.start === 0) {
        const eve = commitments.find(c => isTypeMatch(c) && c.date === prevDate && c.end === 1440);
        if (eve) {
          const allEve = commitments.filter(c => isTypeMatch(c) && c.end === 1440 && c.start === eve.start);
          const allMorn = commitments.filter(c => isTypeMatch(c) && c.start === 0 && c.end === b.end);
          setEditing({
            isNew: false,
            type: b.type,
            start: eve.start,
            end: b.end,
            days: allEve.map(c => c.date),
            oldCommitment: [...allEve, ...allMorn],
          });
          setOpenWheel('start');
          setEditorError('');
          return;
        }
      } else if (b.end === 1440) {
        const morn = commitments.find(c => isTypeMatch(c) && c.date === nextDate && c.start === 0);
        if (morn) {
          const allEve = commitments.filter(c => isTypeMatch(c) && c.end === 1440 && c.start === b.start);
          const allMorn = commitments.filter(c => isTypeMatch(c) && c.start === 0 && c.end === morn.end);
          setEditing({
            isNew: false,
            type: b.type,
            start: b.start,
            end: morn.end,
            days: allEve.map(c => c.date),
            oldCommitment: [...allEve, ...allMorn],
          });
          setOpenWheel('start');
          setEditorError('');
          return;
        }
      }

      const matching = commitments.filter(c => isTypeMatch(c) && c.start === b.start && c.end === b.end);
      setEditing({
        isNew: false,
        type: b.type,
        start: b.start,
        end: b.end,
        days: matching.map(c => c.date),
        oldCommitment: matching,
      });
    }
    setOpenWheel('start');
    setEditorError('');
  };

  // Tap an empty slot to add a new block
  const onSlotPress = (startMinutes: number) => {
    const endMinutes = Math.min(1440, startMinutes + 120);
    setEditing({
      isNew: true,
      type: 'study',
      start: startMinutes,
      end: endMinutes,
      days: [selectedDay],
    });
    setOpenWheel('start');
    setEditorError('');
  };

  // Save changes from block editor
  const saveBlock = () => {
    if (!editing) return;
    if (editing.start === editing.end) {
      setEditorError('Start and end time cannot be the same.');
      return;
    }
    if (editing.days.length === 0) {
      setEditorError('Pick at least one day.');
      return;
    }

    // Generate proposed windows to validate overlap
    const proposedWindows: { date: string; start: number; end: number }[] = [];
    for (const d of editing.days) {
      if (editing.end < editing.start) {
        const idx = WEEK.indexOf(d);
        const nextDate = WEEK[(idx + 1) % WEEK.length];
        proposedWindows.push({ date: d, start: editing.start, end: 1440 });
        proposedWindows.push({ date: nextDate, start: 0, end: editing.end });
      } else {
        proposedWindows.push({ date: d, start: editing.start, end: editing.end });
      }
    }

    // Overlap is not allowed between any time blocks
    const otherStudy = preferences.availability.filter(w => !editing.oldStudy?.includes(w));
    const otherRecovery = commitments.filter(c => c.kind === 'recovery' && !editing.oldCommitment?.includes(c));
    const existingBlocks = [
      ...otherStudy.map(w => ({ ...w, label: 'Study Time' })),
      ...otherRecovery.map(c => ({
        ...c,
        label: c.title.toLowerCase().includes('free') ? 'Free Time' : 'Sleep Time',
      })),
    ];

    for (const pw of proposedWindows) {
      const clash = existingBlocks.find(
        eb => eb.date === pw.date && Math.max(pw.start, eb.start) < Math.min(pw.end, eb.end)
      );
      if (clash) {
        setEditorError(`Overlaps with ${clash.label} (${time(clash.start)} – ${time(clash.end)}) on ${weekday(clash.date)}.`);
        return;
      }
    }

    // Clean up old instances
    if (editing.oldStudy) {
      setPreferences(prev => ({
        ...prev,
        availability: prev.availability.filter(w => !editing.oldStudy!.includes(w)),
      }));
    }
    if (editing.oldCommitment) {
      setCommitments(prev => prev.filter(c => !editing.oldCommitment!.includes(c)));
    }

    // Insert new instances
    if (editing.type === 'study') {
      const newWindows: Window[] = [];
      for (const d of editing.days) {
        if (editing.end < editing.start) {
          const idx = WEEK.indexOf(d);
          const nextDate = WEEK[(idx + 1) % WEEK.length];
          newWindows.push({ date: d, start: editing.start, end: 1440 });
          newWindows.push({ date: nextDate, start: 0, end: editing.end });
        } else {
          newWindows.push({ date: d, start: editing.start, end: editing.end });
        }
      }
      setPreferences(prev => {
        const cleaned = prev.availability.filter(w => !editing.oldStudy?.includes(w));
        return { ...prev, availability: [...cleaned, ...newWindows] };
      });
    } else {
      const title = editing.type === 'free' ? 'Protected free time' : 'Protected sleep';
      const dimension = editing.type === 'free' ? 'social' : 'physical';
      const routine = {
        name: title,
        start: editing.start,
        end: editing.end,
        days: editing.days,
        kind: 'recovery' as const,
        dimension: dimension as any,
      };
      const newCommitments = commitmentsFor(editing.oldCommitment || [], routine);
      setCommitments(prev => {
        const cleaned = prev.filter(c => !editing.oldCommitment?.includes(c));
        return [...cleaned, ...newCommitments];
      });
    }

    setEditing(null);
  };

  const deleteBlock = () => {
    if (!editing) return;
    if (editing.oldStudy) {
      setPreferences(prev => ({
        ...prev,
        availability: prev.availability.filter(w => !editing.oldStudy!.includes(w)),
      }));
    }
    if (editing.oldCommitment) {
      setCommitments(prev => prev.filter(c => !editing.oldCommitment!.includes(c)));
    }
    setEditing(null);
  };

  return (
    <Sheet
      title="Time Blocks"
      subtitle="Your blueprint for scheduling & rescheduling"
      onClose={onClose}
      onSave={saveAll}
    >
      {errors.length > 0 && <Txt style={{ color: C.red, fontSize: 14 }}>{errors.join('\n')}</Txt>}

      {/* Weekly Hours Balance Bar */}
      <View style={{ backgroundColor: C.sage, borderRadius: 16, padding: 12, gap: 8 }}>
        <Txt style={{ fontSize: 12, fontWeight: '700', color: C.green }}>WEEKLY TOTALS</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 8, alignItems: 'center' }}>
            <Txt muted style={{ fontSize: 11, fontWeight: '600' }}>Study</Txt>
            <Txt style={{ fontSize: 15, fontWeight: '800', color: C.study }}>{formatHrs(studyMins)}</Txt>
          </View>
          <View style={{ flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 8, alignItems: 'center' }}>
            <Txt muted style={{ fontSize: 11, fontWeight: '600' }}>Free</Txt>
            <Txt style={{ fontSize: 15, fontWeight: '800', color: C.moss }}>{formatHrs(freeMins)}</Txt>
          </View>
          <View style={{ flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 8, alignItems: 'center' }}>
            <Txt muted style={{ fontSize: 11, fontWeight: '600' }}>Sleep</Txt>
            <Txt style={{ fontSize: 15, fontWeight: '800', color: C.teal }}>{formatHrs(sleepMins)}</Txt>
          </View>
        </View>
      </View>

      {/* M, T, W, T, F, S, S Day Strip */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
        {WEEK.map(date => {
          const on = date === selectedDay;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={weekday(date)}
              onPress={() => setSelectedDay(date)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? C.green : C.sage,
              }}
            >
              <Txt style={{ fontSize: 15, fontWeight: '700', color: on ? C.white : C.green }}>
                {weekday(date).slice(0, 1)}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt muted style={{ fontSize: 12.5, textAlign: 'center' }}>
        Tap any block to edit, or tap an empty slot to add a time block.
      </Txt>

      {/* Visual Timeline Grid */}
      <View style={{ height: 400, borderWidth: 1, borderColor: C.line, borderRadius: 16, overflow: 'hidden', backgroundColor: C.paper }}>
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ flex: 1 }}>
          <View style={{ height: TOTAL_HEIGHT, position: 'relative' }}>
            {/* Horizontal hour guidelines */}
            {Array.from({ length: TO_HOUR - FROM_HOUR + 1 }, (_, i) => {
              const h = FROM_HOUR + i;
              return (
                <View
                  key={h}
                  style={{
                    position: 'absolute',
                    top: i * HOUR,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Txt muted style={{ width: 44, fontSize: 11, textAlign: 'center' }}>
                    {`${String(h).padStart(2, '0')}:00`}
                  </Txt>
                  <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
                </View>
              );
            })}

            {/* Clickable slot pressables */}
            {Array.from({ length: TO_HOUR - FROM_HOUR }, (_, i) => {
              const h = FROM_HOUR + i;
              return (
                <Pressable
                  key={`slot-${h}`}
                  onPress={() => onSlotPress(h * 60)}
                  style={({ pressed }) => ({
                    position: 'absolute',
                    top: i * HOUR,
                    left: 48,
                    right: 8,
                    height: HOUR,
                    borderRadius: 8,
                    backgroundColor: pressed ? C.sage : 'transparent',
                  })}
                />
              );
            })}

            {/* Semi-transparent Time Blocks */}
            {dayBlocks.map(b => {
              const startClamped = Math.max(FROM_HOUR * 60, b.start);
              const endClamped = Math.min(TO_HOUR * 60, b.end);
              if (endClamped <= startClamped) return null;

              const top = ((startClamped - FROM_HOUR * 60) / 60) * HOUR;
              const height = Math.max(26, ((endClamped - startClamped) / 60) * HOUR - 4);

              const color = b.type === 'study' ? C.study : b.type === 'free' ? C.moss : C.teal;
              const bg = b.type === 'study'
                ? 'rgba(91, 125, 189, 0.22)'
                : b.type === 'free'
                ? 'rgba(79, 154, 114, 0.22)'
                : 'rgba(95, 159, 161, 0.22)';

              return (
                <Pressable
                  key={b.id}
                  onPress={() => onBlockPress(b)}
                  style={{
                    position: 'absolute',
                    top,
                    left: 52,
                    right: 12,
                    height,
                    backgroundColor: bg,
                    borderWidth: 1.5,
                    borderLeftWidth: 4,
                    borderColor: color,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: height > 36 ? 6 : 2,
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <Txt numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>
                      {b.title}
                    </Txt>
                    <Txt style={{ fontSize: 11, fontWeight: '600', color }}>
                      {time(b.start)} – {time(b.end)}
                    </Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Quick Block Editor Sheet */}
      {editing && (
        <Sheet
          title={editing.isNew ? 'New Time Block' : 'Edit Time Block'}
          onClose={() => setEditing(null)}
          onSave={saveBlock}
        >
          {editorError !== '' && <Txt style={{ color: C.red, fontSize: 14 }}>{editorError}</Txt>}

          {/* Type Switcher: Study / Free / Sleep */}
          <View style={{ gap: 8 }}>
            <Txt style={{ fontSize: 13, fontWeight: '700', color: C.muted }}>Block Type</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['study', 'free', 'sleep'] as const).map(t => {
                const active = editing.type === t;
                const label = t === 'study' ? 'Study' : t === 'free' ? 'Free Time' : 'Sleep';
                const color = t === 'study' ? C.study : t === 'free' ? C.moss : C.teal;
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    onPress={() => setEditing({ ...editing, type: t })}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: active ? color : C.sage,
                    }}
                  >
                    <Txt style={{ fontSize: 13, fontWeight: '700', color: active ? C.white : C.green }}>
                      {label}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Time Picker */}
          <Group>
            <Row label="Starts" value={time(editing.start)} onPress={() => setOpenWheel(openWheel === 'start' ? null : 'start')} />
            {openWheel === 'start' && <TimeWheel label="Start" value={editing.start} onChange={start => setEditing({ ...editing, start })} />}
            <Row label="Ends" value={time(editing.end)} onPress={() => setOpenWheel(openWheel === 'end' ? null : 'end')} />
            {openWheel === 'end' && <TimeWheel label="End" value={editing.end} onChange={end => setEditing({ ...editing, end })} />}
          </Group>

          {editing.end < editing.start && (
            <View style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.sage, borderRadius: 10, alignSelf: 'flex-start' }}>
              <Txt style={{ fontSize: 12, fontWeight: '700', color: C.green }}>
                🌙 Overnight · Ends next day at {time(editing.end)} ({duration(1440 - editing.start + editing.end)})
              </Txt>
            </View>
          )}

          {/* Days selector */}
          <Group title="Repeats on">
            <DaysPicker days={editing.days} onChange={days => setEditing({ ...editing, days })} />
          </Group>

          {!editing.isNew && (
            <Group>
              <Row label="Delete this block" danger onPress={deleteBlock} />
            </Group>
          )}
        </Sheet>
      )}
    </Sheet>
  );
}
