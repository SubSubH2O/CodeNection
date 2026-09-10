import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, Platform, Pressable, ScrollView, View } from 'react-native';
import { AppState, Candidate, dateLabel, duration, time } from './model';
import { Conflict, optionMetrics } from './conflict';
import { planChanges } from './planChanges';
import { validatePlan } from './planner';
import { C, Icon, LIFT_SHADOW, S, Txt } from './ui';

export function OptionsPanel({ state, conflict, subject, options, index, day, height, reduceMotion, onSelect, onDay, onCancel, onApply }: {
  state: AppState; conflict?: Conflict; subject?: string; options: Candidate[]; index: number; day: string; height: number; reduceMotion: boolean;
  onSelect: (index: number) => void; onDay: (day: string) => void; onCancel: () => void; onApply: () => void;
}) {
  const lift = useRef(new Animated.Value(reduceMotion ? 0 : 60)).current;
  const pointerStart = useRef<number | null>(null);
  const swipe = (dx: number) => { if (Math.abs(dx) > 35) onSelect(Math.max(0, Math.min(options.length - 1, index + (dx < 0 ? 1 : -1)))); };
  useEffect(() => { if (reduceMotion) lift.setValue(0); else Animated.spring(lift, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 230, mass: 1 }).start(); return () => lift.stopAnimation(); }, [reduceMotion, lift]);
  const gestures = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => swipe(g.dx),
  });
  const option = options[index];
  const all = options.map(o => optionMetrics(state, o, conflict));
  const metrics = all[index];
  const changes = planChanges(state, option);
  const dates = [...changes.days].sort();
  const moved = changes.moved[0];
  const first = changes.added[0];
  const summary = option.id.startsWith('fits') ? `${option.title} · ${dates.map(d => dateLabel(d).split(' ')[0]).join(', ')}` : option.id === 'keep' ? `${subject || conflict?.commitment.title || 'Request'} not added` : moved ? `${moved.now.title} → ${dateLabel(moved.now.date)} ${time(moved.now.start)}` : first ? `${first.title} → ${dateLabel(first.date)} ${time(first.start)}` : option.title;
  const rows = [
    { label: 'Deadline buffer', value: `${(metrics.bufferMinutes / 60).toFixed(1)}h`, raw: metrics.bufferMinutes, values: all.map(m => m.bufferMinutes), higher: true },
    { label: 'Things moved', value: String(metrics.moved), raw: metrics.moved, values: all.map(m => m.moved), higher: false },
    { label: 'Protected time', value: metrics.protectedKept ? 'Kept' : 'Lost', raw: metrics.protectedKept ? 1 : 0, values: all.map(m => m.protectedKept ? 1 : 0), higher: true },
    { label: 'Conflicts left', value: String(metrics.conflictsLeft), raw: metrics.conflictsLeft, values: all.map(m => m.conflictsLeft), higher: false },
    { label: 'Study-free days', value: String(metrics.freeDays), raw: metrics.freeDays, values: all.map(m => m.freeDays), higher: true },
    { label: 'Longest sitting', value: metrics.longestSitting ? duration(metrics.longestSitting) : '—', raw: metrics.longestSitting, values: all.map(m => m.longestSitting), higher: false },
  ].filter(row => new Set(row.values).size > 1 || row.label === 'Deadline buffer');
  const stale = option.sourceRevision !== state.revision;
  const invalid = validatePlan(state, option.tasks, option.commitments, option.blocks).length > 0;
  return <Animated.View accessibilityLabel="Plan options" style={{ height, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 14, gap: 8, backgroundColor: C.white, ...LIFT_SHADOW, transform: [{ translateY: lift }] }}>
    <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: C.line }} />
    <View style={{ gap: 7 }}>
      <View style={S.between}><Txt style={{ fontWeight: '700' }}>Compare futures</Txt><View style={[S.row, { gap: 5 }]}>{options.map((o, i) => <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={`Option ${String.fromCharCode(65 + i)}`} accessibilityState={{ selected: i === index }} onPress={() => onSelect(i)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: i === index ? C.green : C.sage }}><Txt style={{ color: i === index ? C.white : C.green, fontWeight: '700' }}>{String.fromCharCode(65 + i)}</Txt></Pressable>)}</View></View>
      <View {...(Platform.OS === 'web' ? {} : gestures.panHandlers)}
        onPointerDown={Platform.OS === 'web' ? e => { pointerStart.current = e.nativeEvent.pageX; } : undefined}
        onPointerUp={Platform.OS === 'web' ? e => { if (pointerStart.current !== null) swipe(e.nativeEvent.pageX - pointerStart.current); pointerStart.current = null; } : undefined}
        accessibilityLabel="Swipe between options" style={{ minHeight: 30, justifyContent: 'center' }}><Txt numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: C.green }}>{`↔ ${summary}`}</Txt></View>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {rows.map(row => {
        const best = row.higher ? Math.max(...row.values) : Math.min(...row.values);
        const isBest = row.raw === best;
        const max = Math.max(1, ...row.values.map(Math.abs));
        return <View key={row.label} accessibilityLabel={`${row.label}: ${row.value}${isBest ? ', best value' : ''}`} style={[S.row, { gap: 8 }]}>
          <Txt style={{ width: 104, fontSize: 11.5 }}>{row.label}</Txt>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.track }}><View style={{ height: 8, width: `${Math.max(4, Math.max(0, row.raw) / max * 100)}%`, borderRadius: 4, backgroundColor: isBest ? C.moss : C.neutralBar }} /></View>
          <Txt style={{ width: 48, textAlign: 'right', fontSize: 12, fontWeight: isBest ? '700' : '500', color: isBest ? C.green : C.muted }}>{row.value}</Txt>
          <View style={{ width: 14 }}>{isBest && <Icon name="check" size={13} />}</View>
        </View>;
      })}
      {dates.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{dates.map(date => <Pressable key={date} accessibilityRole="button" accessibilityLabel={`Show changes on ${dateLabel(date)}`} onPress={() => onDay(date)} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: date === day ? C.green : C.sage, justifyContent: 'center' }}><Txt style={{ fontSize: 11, color: date === day ? C.white : C.green }}>{dateLabel(date)}</Txt></Pressable>)}</ScrollView>}
    </ScrollView>
    {stale && <Txt style={{ color: C.red, fontSize: 12 }}>Week changed. Cancel and check again.</Txt>}
    <View style={S.row}>
      <Pressable accessibilityRole="button" onPress={onCancel} style={{ flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 14 }}><Txt>Cancel</Txt></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: stale || invalid }} disabled={stale || invalid} onPress={onApply} style={{ flex: 1.5, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: C.green, opacity: stale || invalid ? 0.5 : 1 }}><Txt style={{ color: C.white, fontWeight: '700' }}>{invalid ? 'Cannot fit' : `Apply option ${String.fromCharCode(65 + index)}`}</Txt></Pressable>
    </View>
  </Animated.View>;
}
