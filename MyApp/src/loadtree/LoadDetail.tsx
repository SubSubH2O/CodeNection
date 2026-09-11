import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppState, Dimension } from './model';
import { Button, C, Icon, Sheet, Txt } from './ui';
import { dimensionLoad, summarise } from './load';
import { loadStatus } from './TreeScene';
import { weekdayName } from './impact';

const SUBTITLE: Record<Dimension, string> = {
  mental: 'How much focused mental effort your week needs.',
  time: 'How much of your week is already booked.',
  physical: 'Physical effort from shifts, training and getting around.',
  social: 'Time and energy going to other people.',
  errands: 'Small jobs and admin that still need doing.',
};
const BAR = { calm: C.moss, moderate: '#CFAE45', heavy: C.heavy };

/** One area of the tree, opened up: its score, what feeds it, and where in the week it lands. */
export function LoadDetail({ state, dim, onClose, onTask, onDay }: {
  state: AppState; dim: Dimension; onClose: () => void; onTask: (taskId: string) => void; onDay: (date: string, start?: number) => void;
}) {
  const load = dimensionLoad(state, dim);
  const [showAll, setShowAll] = useState(false);
  const status = loadStatus(load);
  const color = BAR[load.tone];
  const max = Math.max(1, ...load.contributors.map(c => c.points));
  const shown = showAll ? load.contributors : load.contributors.slice(0, 3);
  const day = load.busiestDay;
  const meaning = !load.contributors.length
    ? 'Nothing is competing for this area right now.'
    : `Your ${load.label.toLowerCase()} load is ${status.toLowerCase()}${day ? `, and ${weekdayName(day)} carries the most of it` : ''}.`;

  return (
    <Sheet nav headline title={`${load.label} load`} subtitle={SUBTITLE[dim]} onClose={onClose}
      footer={day ? <Button onPress={() => onDay(day)}>{`View ${weekdayName(day)}`}</Button> : undefined}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt accessibilityLabel={`${load.score} out of 100`}>
            <Txt style={{ fontSize: 52, lineHeight: 60, fontWeight: '800', color: C.green, letterSpacing: -1.5 }}>{load.score}</Txt>
            <Txt style={{ fontSize: 26, fontWeight: '700', color: C.muted }}> / 100</Txt>
          </Txt>
          <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: load.tone === 'calm' ? C.sage : C.amberBg }}>
            <Txt style={{ fontSize: 14, fontWeight: '700', color: load.tone === 'calm' ? C.green : C.amber }}>{status}</Txt>
          </View>
        </View>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: C.track }}>
          <View style={{ width: `${Math.max(3, load.score)}%`, height: 10, borderRadius: 5, backgroundColor: color }} />
        </View>
        <Txt muted style={{ fontSize: 14.5 }}>{summarise(load)}</Txt>
      </View>

      {load.contributors.length > 0 && <View style={{ gap: 4, paddingTop: 6, borderTopWidth: 1, borderColor: C.line }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 12, paddingBottom: 4 }}>
          <Txt style={{ fontSize: 18, fontWeight: '800' }}>Top contributors</Txt>
          <Txt muted style={{ fontSize: 13.5 }}>{load.contributors.length} {load.contributors.length === 1 ? 'item' : 'items'}</Txt>
        </View>
        {shown.map((c, i) => (
          <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.title}, ${c.points} points. ${c.source === 'task' ? 'Open task' : 'Show on calendar'}`}
            onPress={() => (c.source === 'task' ? onTask(c.id) : onDay(c.date, c.start))}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: C.line, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={{ fontSize: 15.5, fontWeight: '700' }}>{c.title}</Txt>
              <Txt muted style={{ fontSize: 13 }}>{c.detail}</Txt>
              <View style={{ height: 7, borderRadius: 4, backgroundColor: C.track, marginTop: 6 }}>
                <View style={{ width: `${Math.max(4, (c.points / max) * 100)}%`, height: 7, borderRadius: 4, backgroundColor: C.moss }} />
              </View>
            </View>
            <Txt style={{ fontSize: 15, fontWeight: '800', minWidth: 34, textAlign: 'right' }}>+{c.points}</Txt>
            <Icon name="forward" size={16} color={C.muted} />
          </Pressable>
        ))}
        {load.contributors.length > 3 && <Pressable accessibilityRole="button" onPress={() => setShowAll(!showAll)} style={{ paddingVertical: 8 }}>
          <Txt style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>{showAll ? 'Show fewer' : `Show all ${load.contributors.length}`}</Txt>
        </Pressable>}
      </View>}

      {load.breakdown.length > 0 && <View style={{ gap: 8, paddingTop: 16, borderTopWidth: 1, borderColor: C.line }}>
        <Txt style={{ fontSize: 18, fontWeight: '800', marginBottom: 2 }}>Score breakdown</Txt>
        {load.breakdown.map(row => (
          <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt style={{ fontSize: 15, color: C.muted }}>{row.label}</Txt>
            <Txt style={{ fontSize: 15 }}>{row.points}</Txt>
          </View>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 2, borderTopWidth: 1, borderColor: C.line }}>
          <Txt style={{ fontSize: 16, fontWeight: '800' }}>{load.label} load</Txt>
          <Txt style={{ fontSize: 16, fontWeight: '800' }}>{load.score}</Txt>
        </View>
      </View>}

      <Pressable accessibilityRole="button" disabled={!day} onPress={() => day && onDay(day)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt style={{ fontSize: 16, fontWeight: '800' }}>What this means</Txt>
          <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>{meaning}</Txt>
        </View>
        {day && <Icon name="forward" size={18} color={C.muted} />}
      </Pressable>
    </Sheet>
  );
}
