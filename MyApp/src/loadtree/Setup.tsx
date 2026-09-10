import React, { useState } from 'react';
import { View } from 'react-native';
import { AppState, Commitment, Preferences, WEEK, Window, dateLabel, time } from './model';
import { Button, C, Chip, Field, Notice, S, Sheet, Txt } from './ui';
import { setupErrors } from './state';

const minutes = (value: string) => /^\d{2}:\d{2}$/.test(value) && Number(value.slice(3)) < 60 ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN;
function TimeRange({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  const [start, setStart] = useState(time(value.start));
  const [end, setEnd] = useState(time(value.end));
  return <View style={S.row}><View style={{ flex: 1 }}><Field label="Start (HH:MM)" value={start} onChangeText={v => { setStart(v); onChange({ ...value, start: minutes(v) }); }} /></View><View style={{ flex: 1 }}><Field label="End (HH:MM)" value={end} onChangeText={v => { setEnd(v); onChange({ ...value, end: minutes(v) }); }} /></View></View>;
}
export function Setup({ state, onSave, onClose }: { state: AppState; onSave: (p: Preferences, c: Commitment[]) => void; onClose: () => void }) {
  const [preferences, setPreferences] = useState<Preferences>(JSON.parse(JSON.stringify(state.preferences)));
  const [commitments, setCommitments] = useState<Commitment[]>(JSON.parse(JSON.stringify(state.commitments)));
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const update = (id: string, value: Partial<Commitment>) => setCommitments(all => all.map(c => c.id === id ? { ...c, ...value } : c));
  const save = () => { const issues = setupErrors(preferences, commitments); setErrors(issues); if (!issues.length) onSave(preferences, commitments); };
  return <Sheet title="Make room for your week" subtitle="7–13 September · Times use your local clock" onClose={onClose} footer={<Button onPress={save}>Save weekly setup</Button>}>
    <Notice>Your study windows are the only times we can use. Fixed commitments and protected recovery always take priority.</Notice>
    {state.tasks.length > 0 && <Notice tone="amber">Saving new constraints clears future study blocks. Your task progress stays saved; review a new plan afterward.</Notice>}
    <Field label="Your name" value={preferences.name} onChangeText={name => setPreferences({ ...preferences, name })} />
    <Field label="Maximum study minutes per day" value={String(preferences.dailyLimit || '')} keyboardType="number-pad" onChangeText={v => setPreferences({ ...preferences, dailyLimit: Number(v) })} />
    <Button kind="outline" icon={preferences.avoidAfterShift ? 'check' : 'plus'} onPress={() => setPreferences({ ...preferences, avoidAfterShift: !preferences.avoidAfterShift })}>{preferences.avoidAfterShift ? 'Gentle hour after draining shifts: on' : 'Gentle hour after draining shifts: off'}</Button>
    <Txt style={{ fontWeight: '700', fontSize: 19 }}>When can you study?</Txt>
    {WEEK.map(date => {
      const w = preferences.availability.find(a => a.date === date);
      return <View key={date} style={{ gap: 10, borderBottomWidth: 1, borderColor: C.line, paddingBottom: 14 }}><View style={S.between}><Txt>{dateLabel(date)}</Txt><Chip active={!!w} onPress={() => setPreferences({ ...preferences, availability: w ? preferences.availability.filter(a => a.date !== date) : [...preferences.availability, { date, start: 1080, end: 1200 }] })}>{w ? 'Study window' : 'No study'}</Chip></View>{w && <TimeRange value={w} onChange={value => setPreferences({ ...preferences, availability: preferences.availability.map(a => a.date === date ? value : a) })} />}</View>;
    })}
    <Txt style={{ fontWeight: '700', fontSize: 19 }}>Commitments & recovery</Txt>
    {commitments.map(c => <View key={c.id} style={S.card}><View style={S.between}><View style={{ flex: 1, gap: 5 }}><Txt style={{ fontWeight: '600' }}>{c.title}</Txt><Txt muted style={{ fontSize: 12 }}>{dateLabel(c.date)} · {Number.isFinite(c.start) ? time(c.start) : '—'}–{Number.isFinite(c.end) ? time(c.end) : '—'}</Txt><Chip icon={c.kind === 'recovery' ? 'lock' : undefined} tone={c.kind === 'recovery' ? 'teal' : undefined}>{c.kind === 'recovery' ? 'Protected' : c.kind === 'fixed' ? 'Fixed' : 'Flexible'}</Chip></View><Button kind="quiet" onPress={() => setSelected(selected === c.id ? null : c.id)}>{selected === c.id ? 'Close' : 'Edit'}</Button></View>
      {selected === c.id && <><Field label="Commitment name" value={c.title} onChangeText={title => update(c.id, { title })} /><Field label="Date (YYYY-MM-DD)" value={c.date} onChangeText={date => update(c.id, { date })} /><TimeRange value={c} onChange={value => update(c.id, value)} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{(['fixed', 'flexible', 'recovery'] as const).map(kind => <Chip key={kind} active={c.kind === kind} onPress={() => update(c.id, { kind })}>{kind === 'recovery' ? 'Protected recovery' : kind === 'fixed' ? 'Fixed' : 'Flexible'}</Chip>)}</View>
      <Txt style={S.label}>Area of load</Txt><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{(['mental', 'physical', 'social', 'errands', 'time'] as const).map(dimension => <Chip key={dimension} active={c.dimension === dimension} onPress={() => update(c.id, { dimension })}>{dimension}</Chip>)}</View>
      <Txt style={S.label}>Demand</Txt><View style={S.row}>{(['low', 'medium', 'high'] as const).map(demand => <Chip key={demand} active={c.demand === demand} onPress={() => update(c.id, { demand })}>{demand}</Chip>)}</View>
      {c.kind === 'flexible' && <><Txt muted>Optional permitted destination. Without one, this event stays in place.</Txt><Button kind="outline" onPress={() => update(c.id, { moveWindows: c.moveWindows?.length ? [] : [{ date: WEEK[5], start: 600, end: 600 + (c.end - c.start || 60) }] })}>{c.moveWindows?.length ? 'Remove permitted move' : 'Allow a Saturday move'}</Button>{c.moveWindows?.map((w, i) => <View key={i} style={{ gap: 10 }}><Field label="Move date (YYYY-MM-DD)" value={w.date} onChangeText={date => update(c.id, { moveWindows: [{ ...w, date }] })} /><TimeRange value={w} onChange={value => update(c.id, { moveWindows: [value] })} /></View>)}</>}
      <Button kind="danger" onPress={() => { setCommitments(commitments.filter(x => x.id !== c.id)); setSelected(null); }}>Remove commitment</Button></>}
    </View>)}
    <Button kind="outline" icon="plus" onPress={() => { const id = `event-${Date.now()}`; setCommitments([...commitments, { id, title: 'New commitment', date: WEEK[4], start: 900, end: 960, kind: 'fixed', dimension: 'mental', demand: 'medium' }]); setSelected(id); }}>Add commitment or recovery</Button>
    {errors.length > 0 && <Notice tone="red">{errors.join('\n')}</Notice>}
  </Sheet>;
}
