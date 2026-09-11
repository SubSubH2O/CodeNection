import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C, Icon, Txt } from './ui';
import { Dimension } from './model';
import { DimensionLoad } from './load';
import { TreeScene } from './TreeScene';
import { PixelLeaf } from './Pixel';

/** The home screen's main panel: a greeting, then the tree and its five load cards. */
export function HeroScene({ loads, selected, onSelect, greeting, week }: {
  loads: DimensionLoad[];
  selected?: Dimension;
  onSelect: (d: Dimension) => void;
  greeting: string;
  week: string;
}) {
  return (
    <View style={{ flex: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: C.sage }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#E9F3EE" />
              <Stop offset="0.7" stopColor="#F2F7F3" />
              <Stop offset="1" stopColor="#F6F1E4" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={100} fill="url(#ground)" />
        </Svg>
      </View>

      <View style={{ paddingTop: 18, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexShrink: 1 }}>
          <Txt accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: '800', color: C.green, letterSpacing: -0.4 }}>{greeting}</Txt>
          <Txt muted style={{ fontSize: 13.5 }}>Here’s your current load</Txt>
        </View>
        <Txt style={{ fontSize: 12.5, fontWeight: '600', color: C.muted, paddingTop: 5 }}>{week}</Txt>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
        <TreeScene loads={loads} selected={selected} onSelect={onSelect} />
      </View>
    </View>
  );
}

/** One line under the tree: how the week feels overall, and which area is carrying the most. */
export function LoadSummary({ loads, onOpen }: { loads: DimensionLoad[]; onOpen: (d: Dimension) => void }) {
  if (!loads.length) return null;
  const top = [...loads].sort((a, b) => b.score - a.score)[0];
  const worst = loads.some(l => l.tone === 'heavy') ? 'heavy' : loads.some(l => l.tone === 'moderate') ? 'moderate' : 'calm';
  const headline = worst === 'heavy' ? 'A heavy week' : worst === 'moderate' ? 'A busy week' : 'You’re doing okay this week';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${headline}. ${top.label} is the most loaded right now.`} onPress={() => onOpen(top.id)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 22, backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
        <PixelLeaf size={18} color={worst === 'calm' ? C.moss : worst === 'moderate' ? '#B89A33' : C.heavy} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={{ fontSize: 15.5, lineHeight: 21, fontWeight: '800', color: C.green }}>{headline}</Txt>
        <Txt muted style={{ fontSize: 13 }}>{top.label} is the most loaded right now.</Txt>
      </View>
      <Icon name="forward" size={18} color={C.muted} />
    </Pressable>
  );
}
