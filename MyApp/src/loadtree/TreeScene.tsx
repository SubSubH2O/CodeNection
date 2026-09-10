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
  mental: { cx: 160, cy: 64, rx: 40, ry: 33, dot: { x: 160, y: 34 }, side: 'top', branch: 'M160 152 C157 122 163 92 160 36', taper: 'M161 100 C163 76 159 54 160 36' },
  time: { cx: 78, cy: 106, rx: 37, ry: 30, dot: { x: 44, y: 88 }, side: 'left', branch: 'M150 170 C128 156 86 126 46 90', taper: 'M98 128 C80 114 62 100 46 90' },
  physical: { cx: 244, cy: 110, rx: 37, ry: 30, dot: { x: 278, y: 92 }, side: 'right', branch: 'M170 174 C194 160 236 130 276 94', taper: 'M224 132 C244 116 260 104 276 94' },
  social: { cx: 66, cy: 194, rx: 37, ry: 30, dot: { x: 30, y: 188 }, side: 'left', branch: 'M146 206 C116 202 72 198 32 188', taper: 'M88 202 C68 197 50 192 32 188' },
  errands: { cx: 256, cy: 196, rx: 37, ry: 30, dot: { x: 290, y: 190 }, side: 'right', branch: 'M174 208 C206 204 252 200 288 190', taper: 'M232 205 C252 200 270 195 288 190' },
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

type Blob = { x: number; y: number; rx: number; ry: number; deep: boolean };
type Leaf = { x: number; y: number; r: number; s: number; light: boolean };
type Twig = string;
type Canopy = { blobs: Blob[]; leaves: Leaf[]; twigs: Twig[] };

// A real canopy reads as one mass with leaves breaking its edge — not a scatter
// of separate leaves. Built once from a fixed seed, so it never changes shape.
const CANOPY: Record<Dimension, Canopy> = ORDERED.reduce((all, id, index) => {
  const { cx, cy, rx, ry, dot } = CLUSTERS[id];
  const random = mulberry32(4021 + index * 733);
  const blobs: Blob[] = [];
  for (let i = 0; i < 7; i++) {
    const a = random() * Math.PI * 2;
    const rad = 0.46 * Math.sqrt(random());
    blobs.push({
      x: cx + Math.cos(a) * rx * rad,
      y: cy + Math.sin(a) * ry * rad,
      rx: rx * (0.44 + random() * 0.18),
      ry: ry * (0.5 + random() * 0.22),
      deep: i < 3,
    });
  }
  const leaves: Leaf[] = [];
  for (let i = 0; i < 38; i++) {
    const a = random() * Math.PI * 2;
    const rad = 0.48 + random() * 0.48;
    const x = cx + Math.cos(a) * rx * rad;
    const y = cy + Math.sin(a) * ry * rad;
    leaves.push({
      x, y,
      // Leaves point away from the heart of the clump, the way real ones grow.
      r: (a * 180) / Math.PI + 90 + (random() - 0.5) * 38,
      s: 0.98 - (rad - 0.48) * 0.42 + random() * 0.13,
      light: Math.cos(a) < 0.1 && Math.sin(a) < -0.1,
    });
  }
  leaves.sort((a, b) => b.s - a.s);
  const twigs: Twig[] = [];
  for (let i = 0; i < 3; i++) {
    const a = random() * Math.PI * 2;
    twigs.push(`M${dot.x} ${dot.y} Q${(dot.x + cx) / 2} ${(dot.y + cy) / 2} ${cx + Math.cos(a) * rx * 0.6} ${cy + Math.sin(a) * ry * 0.6}`);
  }
  all[id] = { blobs, leaves, twigs };
  return all;
}, {} as Record<Dimension, Canopy>);

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
        <Ellipse cx={158} cy={267} rx={74} ry={10} fill="#3F6B45" opacity={0.22} />

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

        {/* foliage: mass, then leaves breaking the silhouette */}
        {ORDERED.map(id => {
          const palette = FOLIAGE[toneOf(id)];
          const canopy = CANOPY[id];
          return (
            <G key={`l-${id}`}>
              {canopy.twigs.map((d, i) => <Path key={`t-${i}`} d={d} stroke="#8A6039" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.75} />)}
              {canopy.blobs.map((b, i) => <Ellipse key={`b-${i}`} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={b.deep ? palette.dark : palette.mid} opacity={b.deep ? 0.92 : 0.96} />)}
              {canopy.leaves.map((leaf, i) => (
                <G key={i} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r}) scale(${leaf.s})`}>
                  <Path d={LEAF} fill={leaf.light ? palette.light : `url(#leaf-${id})`} />
                  <Path d={RIB} stroke={palette.dark} strokeWidth={0.7} fill="none" opacity={0.4} strokeLinecap="round" />
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
