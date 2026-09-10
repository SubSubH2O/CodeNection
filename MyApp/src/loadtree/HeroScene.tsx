import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C, Glass, LIFT_SHADOW, Txt } from './ui';
import { Dimension } from './model';
import { DimensionLoad } from './load';
import { TreeScene } from './TreeScene';

/** The illustrated card the tree lives in: sky, meadow, and two glass chips. */
export function HeroScene({ loads, selected, onSelect, greeting, week }: {
  loads: DimensionLoad[];
  selected?: Dimension;
  onSelect: (d: Dimension) => void;
  greeting: string;
  week: string;
}) {
  return (
    <View style={{ borderRadius: 28, overflow: 'hidden', backgroundColor: C.skyBottom, ...LIFT_SHADOW }}>
      <View style={StyleFill}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C.skyTop} />
              <Stop offset="0.55" stopColor={C.skyBottom} />
              <Stop offset="1" stopColor="#EFF9F2" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={100} fill="url(#sky)" />
          <Circle cx={82} cy={14} r={9} fill="#FFFFFF" opacity={0.5} />
          <Circle cx={74} cy={17} r={6} fill="#FFFFFF" opacity={0.42} />
          <Circle cx={20} cy={11} r={7} fill="#FFFFFF" opacity={0.38} />
          <Ellipse cx={50} cy={104} rx={72} ry={22} fill={C.meadow} opacity={0.5} />
        </Svg>
      </View>

      <View style={{ paddingTop: 14, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Glass><Txt style={{ fontSize: 12.5, fontWeight: '700', color: C.green }}>{greeting}</Txt></Glass>
        <Glass><Txt style={{ fontSize: 12.5, fontWeight: '600', color: C.teal }}>{week}</Txt></Glass>
      </View>

      <View style={{ paddingHorizontal: 6, paddingTop: 2 }}>
        <TreeScene bare loads={loads} selected={selected} onSelect={onSelect} />
      </View>

      <Txt muted style={{ fontSize: 12.5, textAlign: 'center', paddingBottom: 16 }}>Tap a branch to see what feeds it</Txt>
    </View>
  );
}

const StyleFill = { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };
