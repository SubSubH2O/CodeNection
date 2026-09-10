import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Stop, Circle, Rect } from 'react-native-svg';
import { C, TONE, Txt } from './ui';
import { Dimension } from './model';
import { DimensionLoad, Tone } from './load';

const VB = { w: 320, h: 292 };

// Leaf colours per load tone: healthy green through to a strained yellow-amber.
const FOLIAGE: Record<Tone, { light: string; mid: string; dark: string }> = {
  calm: { light: '#6FC05A', mid: '#4EA84E', dark: '#3B8B45' },
  moderate: { light: '#C4CB4B', mid: '#A9B93E', dark: '#8CA034' },
  heavy: { light: '#E4B44C', mid: '#D89A34', dark: '#BC7F27' },
};

type Cluster = { cx: number; cy: number; rx: number; ry: number; dot: { x: number; y: number }; side: 'left' | 'right' | 'top'; branch: string; taper: string };

const CLUSTERS: Record<Dimension, Cluster> = {
  mental: { cx: 160, cy: 74, rx: 43, ry: 37, dot: { x: 160, y: 34 }, side: 'top', branch: 'M160 150 C157 120 163 92 160 40', taper: 'M161 100 C163 78 159 58 160 40' },
  time: { cx: 88, cy: 106, rx: 45, ry: 31, dot: { x: 44, y: 66 }, side: 'left', branch: 'M151 170 C130 158 92 122 48 70', taper: 'M98 124 C82 108 64 90 48 70' },
  physical: { cx: 236, cy: 112, rx: 43, ry: 31, dot: { x: 278, y: 76 }, side: 'right', branch: 'M169 174 C192 162 232 130 274 80', taper: 'M226 134 C244 116 260 98 274 80' },
  social: { cx: 78, cy: 184, rx: 46, ry: 33, dot: { x: 30, y: 166 }, side: 'left', branch: 'M147 202 C118 198 76 182 34 168', taper: 'M86 186 C68 180 50 174 34 168' },
  errands: { cx: 244, cy: 186, rx: 44, ry: 33, dot: { x: 292, y: 170 }, side: 'right', branch: 'M175 204 C206 202 250 190 288 172', taper: 'M240 192 C258 186 274 178 288 172' },
};

const ORDERED: Dimension[] = ['social', 'errands', 'time', 'physical', 'mental'];

// Deterministic leaf scatter — generated once, identical on every launch.
function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const LEAF = 'M0 -16.5 C9.5 -11.5 12 -2 0 12.5 C-12 -2 -9.5 -11.5 0 -16.5 Z';
const RIB = 'M0 9.5 L0 -14 M0 3 L-6 -2 M0 -2 L-6 -7 M0 -7 L-4 -11 M0 5 L6 0 M0 0 L6 -5 M0 -5 L4 -10';

type Leaf = { x: number; y: number; r: number; s: number; shade: 0 | 1 | 2 };
const LEAVES: Record<Dimension, Leaf[]> = ORDERED.reduce((all, id, index) => {
  const cluster = CLUSTERS[id];
  const random = mulberry32(1971 + index * 977);
  const leaves: Leaf[] = [];
  for (let i = 0; i < 22; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    const x = cluster.cx + Math.cos(angle) * cluster.rx * radius;
    const y = cluster.cy + Math.sin(angle) * cluster.ry * radius;
    leaves.push({ x, y, r: (x - cluster.cx) * 2.2 + (random() - 0.5) * 44, s: 0.75 + random() * 0.35, shade: Math.floor(random() * 3) as 0 | 1 | 2 });
  }
  all[id] = leaves.sort((a, b) => a.y - b.y);
  return all;
}, {} as Record<Dimension, Leaf[]>);

export function TreeScene({ loads, selected, onSelect, bare = false }: { loads: DimensionLoad[]; selected?: Dimension; onSelect: (d: Dimension) => void; bare?: boolean }) {
  const [width, setWidth] = useState(340);
  const artWidth = Math.min(width, 420);
  const artHeight = (artWidth * VB.h) / VB.w;
  const inset = (width - artWidth) / 2;
  const toneOf = (id: Dimension) => loads.find(l => l.id === id)?.tone ?? 'calm';

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={bare ? { height: artHeight + 4 } : { height: artHeight + 26, borderRadius: 28, overflow: 'hidden', backgroundColor: '#EAF5F0' }}>
      <Svg width={artWidth} height={artHeight} viewBox={`0 0 ${VB.w} ${VB.h}`} style={{ position: 'absolute', left: inset, top: 0 }} accessibilityLabel="Your load, shown as one tree with five branches">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#DCEFE7" /><Stop offset="0.65" stopColor="#F1F8E9" /><Stop offset="1" stopColor="#D5E9D4" /></LinearGradient>
          <LinearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#A5CC78" /><Stop offset="1" stopColor="#74AB69" /></LinearGradient>
          <LinearGradient id="bark" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#805631" /><Stop offset="0.4" stopColor="#BD935C" /><Stop offset="0.7" stopColor="#9A7043" /><Stop offset="1" stopColor="#6F4A2B" /></LinearGradient>
          {ORDERED.map(id => <LinearGradient key={id} id={`leaf-${id}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={FOLIAGE[toneOf(id)].light} /><Stop offset="1" stopColor={FOLIAGE[toneOf(id)].dark} /></LinearGradient>)}
        </Defs>
        <Rect width={320} height={292} fill="url(#sky)" />
        <Circle cx={236} cy={51} r={30} fill="#FFFFFF" opacity={0.4} />
        <Path d="M0 237 Q65 205 146 246 Q230 209 320 229 V292 H0Z" fill="#C8DFC6" opacity={0.55} />
        <Path d="M0 264 Q90 233 175 268 Q260 240 320 257 V292 H0Z" fill="#BEDAB9" opacity={0.6} />
        <Ellipse cx={160} cy={269} rx={122} ry={14} fill="url(#grass)" />

        {/* branches, thick then tapered */}
        {ORDERED.map(id => (
          <G key={`b-${id}`}>
            <Path d={CLUSTERS[id].branch} stroke="url(#bark)" strokeWidth={13} fill="none" strokeLinecap="round" />
            <Path d={CLUSTERS[id].taper} stroke="#8A6039" strokeWidth={6} fill="none" strokeLinecap="round" />
            <Path d={CLUSTERS[id].branch} stroke="#CEAB73" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.4} />
          </G>
        ))}

        {/* The trunk covers the branch joins, so limbs grow out of it naturally. */}
        <Path d="M108 269 C140 255 146 225 146 194 C143 173 154 141 155 104 L164 60 C162 112 165 145 173 177 C182 207 169 250 210 269 L177 265 L160 272 L141 267Z" fill="url(#bark)" />
        <Path d="M124 265 C155 234 152 211 157 183 C165 144 151 135 162 89 M147 266 C164 231 162 210 166 195 M187 266 C168 239 177 217 170 182" stroke="#795431" strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.5} />

        {/* foliage */}
        {ORDERED.map(id => {
          const palette = FOLIAGE[toneOf(id)];
          const shades = [palette.light, palette.mid, palette.dark];
          return (
            <G key={`l-${id}`}>
              {LEAVES[id].map((leaf, i) => <Path key={`stem-${i}`} d={`M${CLUSTERS[id].cx} ${CLUSTERS[id].cy + 20} Q${leaf.x} ${CLUSTERS[id].cy + 8} ${leaf.x} ${leaf.y + 8}`} stroke="#79905A" strokeWidth={1.1} fill="none" opacity={0.65} />)}
              {LEAVES[id].map((leaf, i) => (
                <G key={i} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r}) scale(${leaf.s})`}>
                  <Path d={LEAF} fill={leaf.shade === 1 ? shades[leaf.shade] : `url(#leaf-${id})`} />
                  <Path d={RIB} stroke={palette.dark} strokeWidth={0.7} fill="none" opacity={0.55} strokeLinecap="round" />
                </G>
              ))}
            </G>
          );
        })}

        {/* undergrowth and stones at the base */}
        <G>
          {[{ x: 106, y: 245, s: 1.15, r: -18 }, { x: 120, y: 252, s: 0.95, r: 8 }, { x: 208, y: 243, s: 1.2, r: 16 }, { x: 224, y: 251, s: 0.9, r: -10 }, { x: 90, y: 256, s: 0.75, r: -30 }, { x: 238, y: 257, s: 0.72, r: 28 }].map((s, i) => (
            <G key={i} transform={`translate(${s.x} ${s.y}) rotate(${s.r}) scale(${s.s})`}>
              <Path d={LEAF} fill={i % 2 ? '#3E9247' : '#4FA850'} />
            </G>
          ))}
          <Ellipse cx={141} cy={258} rx={13} ry={9} fill="#9AA1A6" />
          <Ellipse cx={139} cy={255} rx={9} ry={5} fill="#AEB4B8" />
          <Ellipse cx={173} cy={256} rx={15} ry={10} fill="#8E969B" />
          <Ellipse cx={171} cy={253} rx={10} ry={6} fill="#A5ACB1" />
        </G>

        {/* branch markers */}
        {ORDERED.map(id => {
          const { dot } = CLUSTERS[id];
          const active = selected === id;
          const color = FOLIAGE[toneOf(id)].mid;
          return (
            <G key={`d-${id}`} onPress={() => onSelect(id)}>
              <Circle cx={dot.x} cy={dot.y} r={22} fill="transparent" />
              <Ellipse cx={dot.x} cy={dot.y} rx={13} ry={13} fill={C.paper} opacity={0.92} />
              <Ellipse cx={dot.x} cy={dot.y} rx={12} ry={12} fill="none" stroke={color} strokeWidth={active ? 4 : 2.6} />
              <Ellipse cx={dot.x} cy={dot.y} rx={active ? 6.5 : 5} ry={active ? 6.5 : 5} fill={color} />
            </G>
          );
        })}
      </Svg>

      {ORDERED.map(id => {
        const load = loads.find(l => l.id === id);
        if (!load) return null;
        const { dot, side } = CLUSTERS[id];
        const cx = inset + (dot.x / VB.w) * artWidth;
        const cy = (dot.y / VB.h) * artHeight;
        const active = selected === id;
        const placement =
          side === 'top'
            ? { left: cx - 48, top: 5, width: 96, alignItems: 'center' as const }
            : side === 'left'
            ? { left: 8, top: cy + 13, alignItems: 'center' as const }
            : { right: 8, top: cy + 13, alignItems: 'center' as const };
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${load.label} load ${load.score} out of 100`}
            onPress={() => onSelect(id)}
            hitSlop={4}
            style={({ pressed }) => ({ position: 'absolute', minHeight: 44, paddingVertical: 6, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: active ? C.moss : '#FFFFFF', backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.9)', opacity: pressed ? 0.7 : 1, ...placement })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: TONE[load.tone] }} /><Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: '600' }}>{load.label}</Txt><Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: '800', color: C.green }}>{load.score}</Txt></View>
          </Pressable>
        );
      })}
      {!bare && <View pointerEvents="none" style={{ position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' }}><Txt muted style={{ fontSize: 11 }}>Your week, one branch at a time</Txt></View>}
    </View>
  );
}
