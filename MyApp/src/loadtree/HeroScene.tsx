import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C, Txt } from './ui';
import { Dimension } from './model';
import { DimensionLoad } from './load';
import { TreeScene } from './TreeScene';

/** The home screen: the tree on a soft green-to-cream ground, filling the page. */
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
              <Stop offset="0" stopColor="#E6F2ED" />
              <Stop offset="0.6" stopColor="#F3F8F3" />
              <Stop offset="1" stopColor="#F8F1E2" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={100} fill="url(#ground)" />
        </Svg>
      </View>

      <View style={{ paddingTop: 18, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Txt style={{ fontSize: 16, fontWeight: '800', color: C.green }}>{greeting}</Txt>
        <Txt style={{ fontSize: 12.5, fontWeight: '600', color: C.muted }}>{week}</Txt>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 8, paddingBottom: 12 }}>
        <TreeScene loads={loads} selected={selected} onSelect={onSelect} />
      </View>
    </View>
  );
}
