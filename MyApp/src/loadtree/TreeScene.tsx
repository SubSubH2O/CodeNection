import React, { useState } from 'react';
import { Image, ImageSourcePropType, LayoutChangeEvent, Pressable, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { C, SOFT_SHADOW, Txt } from './ui';
import { Dimension } from './model';
import { DimensionLoad, Tone } from './load';

// Pixel-art pieces cut from assets/tree-parts.png. Each canopy exists in three seasons,
// so a branch turns yellow-green, then amber, as its part of the week gets heavier.
const ART: Record<string, ImageSourcePropType> = {
  trunk: require('../../assets/tree/trunk.png'),
  'mental-calm': require('../../assets/tree/mental-calm.png'),
  'mental-moderate': require('../../assets/tree/mental-moderate.png'),
  'mental-heavy': require('../../assets/tree/mental-heavy.png'),
  'time-calm': require('../../assets/tree/time-calm.png'),
  'time-moderate': require('../../assets/tree/time-moderate.png'),
  'time-heavy': require('../../assets/tree/time-heavy.png'),
  'physical-calm': require('../../assets/tree/physical-calm.png'),
  'physical-moderate': require('../../assets/tree/physical-moderate.png'),
  'physical-heavy': require('../../assets/tree/physical-heavy.png'),
  'social-calm': require('../../assets/tree/social-calm.png'),
  'social-moderate': require('../../assets/tree/social-moderate.png'),
  'social-heavy': require('../../assets/tree/social-heavy.png'),
  'errands-calm': require('../../assets/tree/errands-calm.png'),
  'errands-moderate': require('../../assets/tree/errands-moderate.png'),
  'errands-heavy': require('../../assets/tree/errands-heavy.png'),
};
/** Source pixel sizes (assets/tree/sizes.json), for aspect ratios. */
const SIZE: Record<string, [number, number]> = { trunk: [488, 510], mental: [470, 408], time: [422, 364], social: [450, 362], physical: [406, 300], errands: [400, 304] };

// Everything is placed on a 1000 × 1000 stage, then scaled to fit the screen.
const STAGE = 1000;
// Each canopy is placed over the tip of its branch in the trunk art (measured from trunk.png),
// so the leaves cover the branch end and read as growing from it.
const PLACE: Record<'trunk' | Dimension, [number, number, number]> = {
  trunk: [195, 370, 610],
  mental: [311, 162, 380],
  time: [123, 252, 330],
  physical: [541, 316, 320],
  social: [152, 505, 300],
  errands: [584, 505, 300],
};
/** Where each card's pointer lands on its canopy. */
const DOT: Record<Dimension, [number, number]> = { mental: [501, 300], time: [288, 380], physical: [701, 425], social: [302, 615], errands: [734, 610] };
/** The drawn tree spans roughly x 123–861 of the stage; this is its horizontal centre and width. */
const ART_CENTRE = 492;
const ART_WIDTH = 760;
const ORDER: Dimension[] = ['social', 'errands', 'time', 'physical', 'mental'];

const BAR: Record<Tone, string> = { calm: C.moss, moderate: '#CFAE45', heavy: C.heavy };
export const loadStatus = (l: DimensionLoad) => (l.tone === 'heavy' ? 'Heavy' : l.tone === 'moderate' ? 'Getting high' : l.score < 35 ? 'Light load' : 'Manageable');

function LoadCard({ load, active, width, onPress, style }: { load: DimensionLoad; active: boolean; width: number; onPress: () => void; style: object }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${load.label}, ${load.score} percent, ${loadStatus(load)}`} onPress={onPress}
      style={({ pressed }) => ({ position: 'absolute', width, paddingHorizontal: 11, paddingVertical: 7, gap: 3, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: active ? C.moss : 'rgba(255,255,255,0.95)', opacity: pressed ? 0.75 : 1, ...SOFT_SHADOW, ...style })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
        <Txt numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, lineHeight: 17, fontWeight: '700' }}>{load.label}</Txt>
        <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: '700' }}>{load.score}%</Txt>
      </View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: C.track }}>
        <View style={{ width: `${Math.max(4, Math.min(100, load.score))}%`, height: 5, borderRadius: 3, backgroundColor: BAR[load.tone] }} />
      </View>
      <Txt muted numberOfLines={1} style={{ fontSize: 11, lineHeight: 15 }}>{loadStatus(load)}</Txt>
    </Pressable>
  );
}

export function TreeScene({ loads, selected, onSelect, height }: { loads: DimensionLoad[]; selected?: Dimension; onSelect: (d: Dimension) => void; bare?: boolean; height?: number }) {
  const [box, setBox] = useState({ w: 340, h: height ?? 440 });
  // Three cards across the top (the outer two dropped a little), two along the bottom,
  // so no card ever sits on a canopy — the tree in the middle stays fully visible.
  const GAP = 6;
  const cardW = Math.min(150, (box.w - GAP * 2) / 3);
  const CARD_H = 64;
  const STAGGER = 16;
  const band = CARD_H + STAGGER + 10;
  const crown = PLACE.mental[1];
  // Scale to the drawn tree, not the whole stage, and centre it on the trunk.
  const s = Math.max(0.2, Math.min(box.w / ART_WIDTH, (box.h - band - CARD_H * 0.4) / (STAGE - crown)));
  const left = box.w / 2 - ART_CENTRE * s;
  // Centre the tree in whatever height is left between the two rows of cards.
  const spare = Math.max(0, box.h - CARD_H * 0.4 - band - (STAGE - crown) * s);
  const top = band + spare / 2 - crown * s;
  const toneOf = (id: Dimension): Tone => loads.find(l => l.id === id)?.tone ?? 'calm';

  const cardAt: Record<Dimension, { left: number; top: number; anchor: [number, number] }> = {
    mental: { left: (box.w - cardW) / 2, top: 0, anchor: [box.w / 2, 0] },
    time: { left: 0, top: STAGGER, anchor: [cardW / 2, 0] },
    physical: { left: box.w - cardW, top: STAGGER, anchor: [box.w - cardW / 2, 0] },
    social: { left: 0, top: box.h - CARD_H, anchor: [cardW / 2, 0] },
    errands: { left: box.w - cardW, top: box.h - CARD_H, anchor: [box.w - cardW / 2, 0] },
  };
  // Upper cards point down from their bottom edge; lower cards point up from their top edge.
  const anchorY = (id: Dimension) => (id === 'social' || id === 'errands' ? cardAt[id].top : cardAt[id].top + CARD_H - 4);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={height ? { height } : { flex: 1 }}>
      <View accessibilityLabel="Your load, shown as one tree with five branches" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        {(['trunk', ...ORDER] as const).map(id => {
          const [x, y, w] = PLACE[id];
          const [sw, sh] = SIZE[id];
          const image = <Image source={ART[id === 'trunk' ? 'trunk' : `${id}-${toneOf(id)}`]} resizeMode="contain"
            style={{ position: 'absolute', left: left + x * s, top: top + y * s, width: w * s, height: (w * sh / sw) * s }} />;
          return id === 'trunk' ? <React.Fragment key={id}>{image}</React.Fragment>
            : <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${id} branch`} onPress={() => onSelect(id)}>{image}</Pressable>;
        })}
      </View>

      <Svg pointerEvents="none" width={box.w} height={box.h} style={{ position: 'absolute', left: 0, top: 0 }}>
        {ORDER.map(id => {
          const [dx, dy] = DOT[id];
          const x = left + dx * s; const y = top + dy * s;
          return <React.Fragment key={id}>
            <Line x1={cardAt[id].anchor[0]} y1={anchorY(id)} x2={x} y2={y} stroke={C.green} strokeWidth={1.5} opacity={0.7} />
            <Circle cx={x} cy={y} r={6} fill={C.green} stroke={C.white} strokeWidth={2.5} />
          </React.Fragment>;
        })}
      </Svg>

      {ORDER.map(id => {
        const load = loads.find(l => l.id === id);
        if (!load) return null;
        return <LoadCard key={id} load={load} active={selected === id} width={cardW} onPress={() => onSelect(id)} style={{ left: cardAt[id].left, top: cardAt[id].top }} />;
      })}
    </View>
  );
}
