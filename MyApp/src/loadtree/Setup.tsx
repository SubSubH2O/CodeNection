import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AppState, Commitment, Preferences, WEEK, Window, duration, time } from './model';
import { C, Group, Icon, Row, Sheet, Stepper, Toggle, Txt } from './ui';
import { setupErrors } from './state';
import { Routine, RoutineEditor, commitmentsFor, daysLabel, groupCommitments, routineOf } from './RoutineEditor';

const KIND_LABEL: Record<Commitment['kind'], string> = { fixed: 'Fixed', flexible: 'Flexible', recovery: 'Rest' };

/** Study windows with the same hours are one repeating study time. */
function groupWindows(all: Window[]): Window[][] {
  const groups = new Map<string, Window[]>();
  for (const w of all) groups.set(`${w.start}|${w.end}`, [...(groups.get(`${w.start}|${w.end}`) || []), w]);
  return [...groups.values()].sort((a, b) => a[0].start - b[0].start);
}

/** A list row in the style of an alarm list: the time large, when it repeats underneath. */
function RoutineRow({ big, sub, tag, onPress, label }: { big: string; sub: string; tag?: string; onPress: () => void; label: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
    <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ flex: 1 }}>
        <Txt style={{ fontSize: 19, fontWeight: '600', letterSpacing: -0.2 }}>{big}</Txt>
        <Txt muted style={{ fontSize: 13 }}>{sub}</Txt>
      </View>
      {!!tag && <Txt muted style={{ fontSize: 13 }}>{tag}</Txt>}
      <Icon name="forward" size={16} color={C.muted} />
    </View>
  </Pressable>;
}

type Editing = { type: 'study'; old: Window[] } | { type: 'event'; rest: boolean; old: Commitment[] } | null;

export function Setup({ state, onSave, onClose }: { state: AppState; onSave: (p: Preferences, c: Commitment[]) => void; onClose: () => void }) {
  const [preferences, setPreferences] = useState<Preferences>(JSON.parse(JSON.stringify(state.preferences)));
  const [commitments, setCommitments] = useState<Commitment[]>(JSON.parse(JSON.stringify(state.commitments)));
  const [editing, setEditing] = useState<Editing>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (patch: Partial<Preferences>) => setPreferences(p => ({ ...p, ...patch }));
  const save = () => { const issues = setupErrors(preferences, commitments); setErrors(issues); if (!issues.length) onSave(preferences, commitments); };

  const saveStudy = (old: Window[], r: Routine) => {
    const rest = preferences.availability.filter(w => !old.includes(w));
    set({ availability: [...rest, ...r.days.map(date => ({ date, start: r.start, end: r.end }))] });
    setEditing(null);
  };
  const saveEvent = (old: Commitment[], r: Routine) => {
    setCommitments(all => [...all.filter(c => !old.includes(c)), ...commitmentsFor(old, r)]);
    setEditing(null);
  };

  return <Sheet title="Weekly setup" onClose={onClose} onSave={save}>
    {errors.length > 0 && <Txt style={{ color: C.red, fontSize: 14 }}>{errors.join('\n')}</Txt>}

    <Group title="Study time">
      {groupWindows(preferences.availability).map(group => <RoutineRow key={`${group[0].start}-${group[0].end}`}
        big={`${time(group[0].start)} – ${time(group[0].end)}`} sub={daysLabel(group.map(w => w.date))}
        label={`Study ${time(group[0].start)} to ${time(group[0].end)}, ${daysLabel(group.map(w => w.date))}`}
        onPress={() => setEditing({ type: 'study', old: group })} />)}
      <Row label="Add study time" right={<Icon name="plus" size={20} />} onPress={() => setEditing({ type: 'study', old: [] })} />
    </Group>

    {([['Rest', true], ['Events', false]] as const).map(([title, rest]) => <Group key={title} title={title}>
      {groupCommitments(commitments).filter(g => (g[0].kind === 'recovery') === rest).map(group => <RoutineRow key={group[0].id}
        big={group[0].title} sub={`${daysLabel(group.map(c => c.date))} · ${time(group[0].start)} – ${time(group[0].end)}`} tag={rest ? undefined : KIND_LABEL[group[0].kind]}
        label={`${group[0].title}, ${daysLabel(group.map(c => c.date))}, ${time(group[0].start)} to ${time(group[0].end)}`}
        onPress={() => setEditing({ type: 'event', rest, old: group })} />)}
      <Row label={rest ? 'Add rest' : 'Add event'} right={<Icon name="plus" size={20} />} onPress={() => setEditing({ type: 'event', rest, old: [] })} />
    </Group>)}

    <Group title="Limits">
      <Row label="Most study per day" right={<Stepper label="daily study limit" value={duration(preferences.dailyLimit)} onMinus={() => set({ dailyLimit: Math.max(30, preferences.dailyLimit - 30) })} onPlus={() => set({ dailyLimit: Math.min(600, preferences.dailyLimit + 30) })} />} />
      <Row label="Rest after tiring shifts" sub="Keeps the next hour free" right={<Toggle label="Rest after tiring shifts" value={preferences.avoidAfterShift} onChange={avoidAfterShift => set({ avoidAfterShift })} />} />
    </Group>

    <Group title="Name">
      <TextInput accessibilityLabel="Your name" value={preferences.name} onChangeText={name => set({ name })} placeholder="Your name" placeholderTextColor={C.muted}
        style={{ fontSize: 16, color: C.ink, paddingVertical: 16 }} />
    </Group>

    {state.tasks.length > 0 && <Txt muted style={{ fontSize: 12.5, textAlign: 'center' }}>Saving clears upcoming study blocks.</Txt>}

    {editing?.type === 'study' && <RoutineEditor study heading={editing.old.length ? 'Study time' : 'Add study time'}
      initial={editing.old.length ? { name: 'Study', start: editing.old[0].start, end: editing.old[0].end, days: editing.old.map(w => w.date), kind: 'fixed', dimension: 'mental' } : { name: 'Study', start: 1080, end: 1200, days: [], kind: 'fixed', dimension: 'mental' }}
      onClose={() => setEditing(null)} onSave={r => saveStudy(editing.old, r)}
      onDelete={editing.old.length ? () => { set({ availability: preferences.availability.filter(w => !editing.old.includes(w)) }); setEditing(null); } : undefined} />}
    {editing?.type === 'event' && <RoutineEditor heading={editing.rest ? (editing.old.length ? 'Rest' : 'Add rest') : editing.old.length ? 'Edit event' : 'Add event'}
      kinds={editing.rest ? ['recovery'] : ['fixed', 'flexible']}
      initial={editing.old.length ? routineOf(editing.old) : editing.rest
        ? { name: 'Sleep', start: 1320, end: 1440, days: [...WEEK], kind: 'recovery', dimension: 'physical' }
        : { name: '', start: 900, end: 960, days: [], kind: 'fixed', dimension: 'mental' }}
      onClose={() => setEditing(null)} onSave={r => saveEvent(editing.old, r)}
      onDelete={editing.old.length ? () => { setCommitments(all => all.filter(c => !editing.old.includes(c))); setEditing(null); } : undefined} />}
  </Sheet>;
}
