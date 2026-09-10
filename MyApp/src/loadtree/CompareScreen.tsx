import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import { Candidate, dateLabel, time } from './model';
import { Conflict } from './conflict';
import { C, Icon, S, SOFT_SHADOW, Txt } from './ui';

function Consequence({ kind, text }: { kind: 'plus' | 'minus'; text: string }) {
  const good = kind === 'plus';
  return (
    <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, marginTop: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: good ? C.sage : C.flagBg }}>
        <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: '800', color: good ? C.green : C.flag }}>{good ? '+' : '−'}</Txt>
      </View>
      <Txt style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}>{text}</Txt>
    </View>
  );
}

/** One trade-off per card, swiped horizontally, so nothing competes for the screen. */
export function CompareScreen({ conflict, options, onBack, onPreview }: {
  conflict: Conflict;
  options: Candidate[];
  onBack: () => void;
  onPreview: (option: Candidate) => void;
}) {
  const [width, setWidth] = useState(340);
  const [index, setIndex] = useState(0);
  const card = Math.max(220, width - 44);

  return (
    <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={[S.row, { paddingHorizontal: 16, paddingBottom: 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to the calendar" onPress={onBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={20} />
        </Pressable>
        <Txt accessibilityRole="header" style={{ fontSize: 19, fontWeight: '800', color: C.green, letterSpacing: -0.3 }}>Compare plans</Txt>
      </View>

      <View style={{ marginHorizontal: 16, padding: 13, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, gap: 2 }}>
        <Txt muted style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>ADDING</Txt>
        <Txt style={{ fontSize: 15.5, fontWeight: '700' }}>{conflict.commitment.title}</Txt>
        <Txt muted style={{ fontSize: 13 }}>{dateLabel(conflict.commitment.date, true)} · {time(conflict.commitment.start)}–{time(conflict.commitment.end)}</Txt>
      </View>

      <ScrollView
        horizontal
        pagingEnabled={false}
        snapToInterval={card + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / (card + 12)))}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}
        style={{ flexGrow: 0 }}
      >
        {options.map((option, i) => (
          <View key={option.id} style={{ width: card, backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: i === index ? '#AECFBB' : C.line, padding: 18, gap: 13, ...SOFT_SHADOW }}>
            <Txt muted style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>OPTION {String.fromCharCode(65 + i)}</Txt>
            <Txt style={{ fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.4 }}>{option.title}</Txt>

            <View style={{ gap: 8 }}>
              {option.benefits.map(b => <Consequence key={b} kind="plus" text={b} />)}
              {option.costs.map(c => <Consequence key={c} kind="minus" text={c} />)}
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${option.title}`} onPress={() => onPreview(option)}
              style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: option.id === 'keep' ? C.white : C.green, borderWidth: option.id === 'keep' ? 1 : 0, borderColor: C.line }}>
              <Txt style={{ fontWeight: '700', color: option.id === 'keep' ? C.ink : C.white }}>{option.id === 'keep' ? 'Keep it as it is' : 'Preview calendar'}</Txt>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {options.map((option, i) => (
          <View key={option.id} style={{ width: i === index ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? C.green : C.line }} />
        ))}
      </View>
      <Txt muted style={{ fontSize: 12, textAlign: 'center', paddingTop: 10 }}>Swipe to compare · nothing is saved until you apply</Txt>
    </View>
  );
}
