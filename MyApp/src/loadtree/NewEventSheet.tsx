import React, { useState } from 'react';
import { View } from 'react-native';
import { Commitment, Dimension, dateLabel, duration, time } from './model';
import { Button, C, Chip, Field, Notice, S, Sheet, Txt } from './ui';

const LENGTHS = [30, 60, 90, 120, 180];
const KINDS: { id: Commitment['kind']; label: string; hint: string }[] = [
  { id: 'fixed', label: 'Fixed', hint: 'Cannot be moved by a plan' },
  { id: 'flexible', label: 'Flexible', hint: 'A plan may suggest moving it' },
  { id: 'recovery', label: 'Protected rest', hint: 'Never scheduled over' },
];
const AREAS: Dimension[] = ['mental', 'physical', 'social', 'errands'];

/** Direct calendar editing: whatever the student taps on the grid, they name here. */
export function NewEventSheet({ date, start, existing, onClose, onAdd, onDelete }: {
  date: string;
  start: number;
  existing?: Commitment;
  onClose: () => void;
  onAdd: (c: Commitment) => void;
  onDelete?: (id: string) => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [length, setLength] = useState(existing ? existing.end - existing.start : 60);
  const [kind, setKind] = useState<Commitment['kind']>(existing?.kind ?? 'fixed');
  const [dimension, setDimension] = useState<Dimension>(existing?.dimension ?? 'mental');
  const [error, setError] = useState('');

  const end = Math.min(1440, start + length);
  const save = () => {
    if (!title.trim()) { setError('Give it a name so you recognise it later.'); return; }
    if (end <= start) { setError('That would run past midnight. Pick a shorter length.'); return; }
    onAdd({
      ...(existing ?? {}),
      id: existing?.id ?? `event-${Date.now()}`,
      title: title.trim(),
      date,
      start,
      end,
      kind,
      dimension: kind === 'recovery' ? 'physical' : dimension,
      demand: kind === 'recovery' ? 'low' : 'medium',
    });
  };

  return <Sheet title={existing ? 'Edit this block' : 'Add to your day'} subtitle={`${dateLabel(date, true)} · ${time(start)}`} onClose={onClose}
    footer={<Button icon="check" onPress={save}>{existing ? 'Save changes' : 'Add to calendar'}</Button>}>
    <Field label="What is it?" placeholder="e.g. Group meeting" value={title} onChangeText={t => { setTitle(t); setError(''); }} />

    <View style={{ gap: 8 }}>
      <Txt style={S.label}>How long?</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {LENGTHS.map(m => <Chip key={m} active={length === m} onPress={() => setLength(m)}>{duration(m)}</Chip>)}
      </View>
      <Txt muted style={{ fontSize: 12.5 }}>{time(start)} – {time(end)}</Txt>
    </View>

    <View style={{ gap: 8 }}>
      <Txt style={S.label}>Can a plan move it?</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {KINDS.map(k => <Chip key={k.id} active={kind === k.id} onPress={() => setKind(k.id)}>{k.label}</Chip>)}
      </View>
      <Txt muted style={{ fontSize: 12.5 }}>{KINDS.find(k => k.id === kind)!.hint}</Txt>
    </View>

    {kind !== 'recovery' && <View style={{ gap: 8 }}>
      <Txt style={S.label}>Which area of load?</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {AREAS.map(d => <Chip key={d} active={dimension === d} onPress={() => setDimension(d)}>{d}</Chip>)}
      </View>
    </View>}

    {existing && onDelete && <Button kind="danger" onPress={() => onDelete(existing.id)}>Remove from calendar</Button>}
    {error !== '' && <Notice tone="red">{error}</Notice>}
    <Txt muted style={{ fontSize: 12 }}>Adding a commitment clears study blocks that have not happened yet, so you can review a fresh plan around it.</Txt>
  </Sheet>;
}
