import React, { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { AppState, Candidate, duration } from './model';
import { C, Icon, SOFT_SHADOW, Txt } from './ui';
import { DayItem, Options, changesOf, dayItems, describe, fitSummary, freeByWeek, impactOf, keepRows, weekdayName } from './impact';

// The two steps between understanding a brain-dump and previewing it on the calendar:
// "Check the fit" (why it does not fit) and "Compare options" (ways to make it fit).

function Header({ title, sub, onBack, right }: { title: string; sub: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingBottom: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="back" size={21} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Txt accessibilityRole="header" style={{ fontSize: 21, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Txt>
          {right}
        </View>
        <Txt muted style={{ fontSize: 13.5, lineHeight: 19 }}>{sub}</Txt>
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: pressed ? 0.85 : 1 })}>
      <Txt style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>{label}</Txt>
      <Icon name="arrow" size={20} color={C.white} />
    </Pressable>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 }}>
      <Txt style={{ color: C.green, fontWeight: '700', fontSize: 15 }}>{label}</Txt>
    </Pressable>
  );
}

function Badge({ text, good, wide = false }: { text: string; good: boolean; wide?: boolean }) {
  return (
    <View style={{ minWidth: wide ? 112 : 0, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: good ? C.sage : C.amberBg, alignItems: 'center' }}>
      <Txt style={{ fontSize: 13, lineHeight: 17, fontWeight: '700', color: good ? C.green : C.amber }}>{text}</Txt>
    </View>
  );
}

// ---------- 2. Check the fit ----------

function Stat({ label, value, caption, alert = false }: { label: string; value: string; caption?: string; alert?: boolean }) {
  return (
    <View style={{ flex: 1, padding: 12, gap: 3, borderRadius: 16, backgroundColor: alert ? C.redBg : C.surface }}>
      <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: '600', color: alert ? C.red : C.muted }}>{label}</Txt>
      <Txt style={{ fontSize: 20, lineHeight: 26, fontWeight: '800', color: alert ? C.red : C.ink }}>{value}</Txt>
      {!!caption && <Txt muted numberOfLines={2} style={{ fontSize: 11.5, lineHeight: 15 }}>{caption}</Txt>}
    </View>
  );
}

const TINT: Record<DayItem['kind'], [string, string]> = { commitment: [C.studyBg, C.study], study: [C.sage, C.moss], new: [C.flagBg, C.flag], clash: [C.redBg, C.red] };

function DayRow({ item, last }: { item: DayItem; last: boolean }) {
  const [bg, fg] = TINT[item.kind];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10 }}>
      <Txt muted style={{ width: 82, fontSize: 12.5, lineHeight: 17, paddingTop: 13 }}>{item.when}</Txt>
      <View style={{ width: 12, alignItems: 'center' }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: fg, marginTop: 17 }} />
        {!last && <View style={{ flex: 1, width: 2, backgroundColor: C.line, marginTop: 4, marginBottom: -12 }} />}
      </View>
      <View style={{ flex: 1, backgroundColor: bg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, borderLeftWidth: 3, borderLeftColor: fg }}>
        <Txt style={{ fontSize: 14.5, lineHeight: 20, fontWeight: '700' }}>{item.title}</Txt>
        <Txt muted style={{ fontSize: 12.5, lineHeight: 17 }}>{item.note}</Txt>
      </View>
    </View>
  );
}

export function FitScreen({ state, outcome, onBack, onCompare, onEdit }: { state: AppState; outcome: Options; onBack: () => void; onCompare: () => void; onEdit: () => void }) {
  const fit = fitSummary(state, outcome);
  const day = weekdayName(fit.day);
  const items = dayItems(state, outcome, fit.day);
  // A project due weeks away is judged over those weeks, not one day.
  // Whole calendar days to the due date, so "due in two weeks" reads as two weeks, not three.
  const spanDays = Math.round((Date.parse(`${fit.deadline.slice(0, 10)}T12:00:00Z`) - Date.parse(`${state.now.slice(0, 10)}T12:00:00Z`)) / 86400000);
  const long = spanDays > 7;
  const span = `next ${Math.ceil(spanDays / 7)} weeks`;
  const weeks = long ? freeByWeek(state, outcome, fit) : [];
  const most = Math.max(1, ...weeks.map(w => w.minutes));
  const title = long ? (fit.short ? `The ${span} are over capacity` : `The ${span} need rearranging`) : fit.short ? `${day} is over capacity` : `${day} needs rearranging`;
  const sub = fit.short ? `You’re short by ${duration(fit.short)}.` : `Something has to move to make room.`;
  return (
    <View style={{ flex: 1 }}>
      <Header title="Check the fit" sub="How these items affect your week" onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 20 }}>
        <View>
          <Txt accessibilityRole="header" style={{ fontSize: 22, lineHeight: 29, fontWeight: '800', letterSpacing: -0.3 }}>{title}</Txt>
          <Txt muted style={{ fontSize: 14.5 }}>{sub}</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat label="Time needed" value={duration(fit.needed)} caption={fit.neededFor} />
          <Stat label="Time available" value={duration(fit.available)} caption={`Before ${weekdayName(fit.deadline.slice(0, 10), true)}`} />
          <Stat label="Short by" value={fit.short ? duration(fit.short) : '—'} caption={fit.short ? undefined : 'Fits if things move'} alert={fit.short > 0} />
        </View>

        {long
          ? <View style={{ gap: 12 }}>
              <Txt style={{ fontSize: 16.5, fontWeight: '800' }}>Free study time by week</Txt>
              {weeks.map(w => <View key={w.label} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt style={{ fontSize: 14.5 }}>{w.label}</Txt>
                  <Txt style={{ fontSize: 14.5, fontWeight: '700' }}>{duration(w.minutes)}</Txt>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: C.track }}>
                  <View style={{ width: `${Math.max(2, (w.minutes / most) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: C.moss }} />
                </View>
              </View>)}
            </View>
          : <View style={{ gap: 12 }}>
              <Txt style={{ fontSize: 16.5, fontWeight: '800' }}>What’s on {day}?</Txt>
              <View style={{ gap: 10 }}>{items.map((item, i) => <DayRow key={item.key} item={item} last={i === items.length - 1} />)}</View>
            </View>}

        <View style={{ gap: 10 }}>
          <Txt style={{ fontSize: 16.5, fontWeight: '800' }}>If you keep everything</Txt>
          <View style={{ backgroundColor: C.surface, borderRadius: 18, paddingHorizontal: 16 }}>
            {keepRows(outcome, fit).map((row, i) => (
              <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 15, fontWeight: '700' }}>{row.label}</Txt>
                  <Txt muted style={{ fontSize: 12.5, lineHeight: 17 }}>{row.sub}</Txt>
                </View>
                <Txt style={{ fontSize: 16, fontWeight: '800', color: row.bad ? C.red : C.ink }}>{row.value}</Txt>
              </View>
            ))}
          </View>
        </View>

        <PrimaryButton label="Compare ways to fix this" onPress={onCompare} />
        <TextButton label="Go back and edit items" onPress={onEdit} />
      </ScrollView>
    </View>
  );
}

// ---------- 3. Compare options ----------

function Dots({ count, index }: { count: number; index: number }) {
  return (
    <View accessibilityLabel={`Plan ${index + 1} of ${count}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {Array.from({ length: count }, (_, k) => <View key={k} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: k === index ? C.green : C.line }} />)}
      <Txt muted style={{ fontSize: 13, marginLeft: 4 }}>{index + 1} / {count}</Txt>
    </View>
  );
}

function PlanCard({ state, outcome, option, letter, width, onPreview }: { state: AppState; outcome: Options; option: Candidate; letter: string; width: number; onPreview: () => void }) {
  const story = describe(state, option, outcome.request);
  const rows = changesOf(state, option, outcome.request);
  const impact = impactOf(state, option, outcome.conflict);
  return (
    <View style={{ width, marginRight: 12, backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: C.line, padding: 16, gap: 14, ...SOFT_SHADOW }}>
      <View style={{ gap: 4 }}>
        <Txt style={{ color: C.green, fontWeight: '700', fontSize: 13.5 }}>Plan {letter}</Txt>
        <Txt style={{ fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.3 }}>{story.title}</Txt>
        <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>{story.desc}</Txt>
        {story.tag && <View style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.amberBg }}>
          <Txt style={{ fontSize: 12, lineHeight: 16, color: C.amber, fontWeight: '700' }}>{story.tag}</Txt>
        </View>}
      </View>

      <View style={{ backgroundColor: C.surface, borderRadius: 18, padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt style={{ fontSize: 15, fontWeight: '800' }}>Changes</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel={`View plan ${letter} on the calendar`} onPress={onPreview} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Txt style={{ color: C.green, fontWeight: '700', fontSize: 13 }}>View on calendar</Txt>
            <Icon name="forward" size={14} />
          </Pressable>
        </View>
        {rows.slice(0, 3).map(row => (
          <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10, borderLeftWidth: 3, borderLeftColor: row.badge === 'New' ? C.moss : C.flag }}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14, lineHeight: 19, fontWeight: '700' }}>{row.title}</Txt>
              <Txt muted style={{ fontSize: 12.5, lineHeight: 17 }}>{row.when}</Txt>
            </View>
            <Badge text={row.badge} good={row.badge === 'New'} />
          </View>
        ))}
        {rows.length > 3 && <Txt muted style={{ fontSize: 12.5 }}>+{rows.length - 3} more on the calendar</Txt>}
        <Txt muted style={{ fontSize: 12.5 }}>Everything else stays the same</Txt>
      </View>

      <View>
        <Txt style={{ fontSize: 15, fontWeight: '800', marginBottom: 4 }}>Impact</Txt>
        {impact.map((item, i) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
            <Icon name={item.icon} size={20} color={C.ink} />
            <Txt style={{ flex: 1, fontSize: 14.5 }}>{item.label}</Txt>
            <Badge text={item.value} good={item.good} wide />
          </View>
        ))}
      </View>

      <PrimaryButton label="Preview this plan" onPress={onPreview} />
    </View>
  );
}

export function CompareScreen({ state, outcome, options, index, onIndex, onBack, onPreview, onEdit }: {
  state: AppState; outcome: Options; options: Candidate[]; index: number;
  onIndex: (i: number) => void; onBack: () => void; onPreview: (i: number) => void; onEdit: () => void;
}) {
  const { width } = useWindowDimensions();
  const page = Math.min(width, 520);
  const cardW = page - 56;
  const step = cardW + 12;
  const pager = useRef<ScrollView>(null);
  // Reopening the comparison lands on the plan that was being looked at.
  useEffect(() => { const t = setTimeout(() => pager.current?.scrollTo({ x: index * step, animated: false }), 0); return () => clearTimeout(t); }, []);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(options.length - 1, Math.round(e.nativeEvent.contentOffset.x / step)));
    if (i !== index) onIndex(i);
  };
  return (
    <View style={{ flex: 1 }}>
      <Header title="Compare options" sub="Each plan shows what changes and what it costs." onBack={onBack} right={<Dots count={options.length} index={index} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 16 }}>
        <ScrollView ref={pager} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast" disableIntervalMomentum
          onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={{ paddingHorizontal: 28, paddingVertical: 6 }}>
          {options.map((option, i) => <PlanCard key={option.id} state={state} outcome={outcome} option={option} letter={String.fromCharCode(65 + i)} width={cardW} onPreview={() => onPreview(i)} />)}
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={onEdit}
          style={({ pressed }) => ({ marginHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 15.5, fontWeight: '800' }}>Still not ideal?</Txt>
            <Txt muted style={{ fontSize: 13 }}>Go back and edit the items.</Txt>
          </View>
          <Icon name="forward" size={18} color={C.muted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
