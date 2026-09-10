import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Svg, { Ellipse, Rect } from 'react-native-svg';
import { C, TONE, Txt } from './ui';
import { Dimension } from './model';
import { DimensionLoad, Tone } from './load';

// A fine pixel grid: blocky enough to feel crafted, small enough to stay calm.
const P = 4;
const W = 80;
const H = 102;

// Leaves use LoadTree's own greens, shifting to its amber as an area gets heavy. No outlines.
const LEAVES: Record<Tone, { light: string; base: string; shade: string }> = {
  calm: { light: '#6DB78E', base: '#4F9A72', shade: '#2F7D5E' },
  moderate: { light: '#F5D061', base: '#E2A336', shade: '#B87B1D' },
  heavy: { light: '#F0A369', base: '#DC6E38', shade: '#B44E1E' },
};
const BARK = { light: '#B48A5E', base: '#946B43', shade: '#7A5535' };
const BASE = 92; // the row where the trunk meets the ground
const GROUND: [number, number, string][] = [[BASE, 20, '#6DB78E'], [BASE + 1, 23, '#5FAE83'], [BASE + 2, 24, '#4F9A72'], [BASE + 3, 24, '#DDEBE2'], [BASE + 4, 22, '#E6F2ED'], [BASE + 5, 19, '#EEF5F0']];

type Cluster = { cx: number; cy: number; rx: number; ry: number; from: [number, number]; side: 'top' | 'left' | 'right' };
const CLUSTERS: Record<Dimension, Cluster> = {
  mental: { cx: 40, cy: 18, rx: 14, ry: 11, from: [40, 40], side: 'top' },
  time: { cx: 17, cy: 34, rx: 11, ry: 9, from: [38, 50], side: 'left' },
  physical: { cx: 63, cy: 34, rx: 11, ry: 9, from: [42, 50], side: 'right' },
  // The lower tier sits well below the upper one, leaving room for the upper labels in between.
  social: { cx: 15, cy: 66, rx: 11, ry: 8, from: [38, 74], side: 'left' },
  errands: { cx: 65, cy: 66, rx: 11, ry: 8, from: [42, 74], side: 'right' },
};
const ORDERED: Dimension[] = ['social', 'errands', 'time', 'physical', 'mental'];

/** A fixed pseudo-random value per cell, so the tree has texture but never changes shape. */
function hash(x: number, y: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type Run = { x: number; y: number; w: number; fill: string };

/** Paints the tree into a cell grid, then merges each row into runs so there are few shapes to draw. */
function paint(tones: Record<Dimension, Tone>): Run[] {
  const grid = new Map<number, string>();
  const put = (x: number, y: number, fill: string) => { if (x >= 0 && x < W && y >= 0 && y < H) grid.set(y * W + x, fill); };

  for (const [y, half, fill] of GROUND) for (let x = 40 - half; x < 40 + half; x++) put(x, y, fill);

  // Branches: two-cell-thick stepped lines from the trunk to each canopy.
  for (const id of ORDERED) {
    const { cx, cy, ry, from } = CLUSTERS[id];
    const [x0, y0] = from;
    const x1 = cx; const y1 = Math.round(cy + ry * 0.3);
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      // Two cells wide in both directions, so steep limbs are as solid as flat ones.
      put(x, y, BARK.light); put(x + 1, y, BARK.base); put(x, y + 1, BARK.base); put(x + 1, y + 1, BARK.shade); put(x, y + 2, BARK.shade);
    }
  }

  // Trunk: narrow at the top, widening to the roots; lit from the left.
  for (let y = 38; y <= BASE; y++) {
    const t = (y - 38) / (BASE - 38);
    const half = 2 + Math.round(t * t * 3) + Math.max(0, y - (BASE - 4));
    for (let x = 40 - half; x < 40 + half; x++) {
      const edge = x === 40 - half ? BARK.light : x === 40 + half - 1 ? BARK.shade : BARK.base;
      put(x, y, hash(x, y) > 0.9 && edge === BARK.base ? BARK.shade : edge);
    }
  }

  // Canopies: pixel ellipses with a slightly ragged edge, three flat tones, and a few geometric leaves.
  for (const id of ORDERED) {
    const { cx, cy, rx, ry } = CLUSTERS[id];
    const leaf = LEAVES[tones[id]];
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++) {
      for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
        const nx = (x - cx) / rx; const ny = (y - cy) / ry;
        if (nx * nx + ny * ny > 1 + (hash(x, y) - 0.5) * 0.3) continue;
        const light = nx * 0.6 + ny;
        let fill = light < -0.55 ? leaf.light : light > 0.5 ? leaf.shade : leaf.base;
        if (fill === leaf.base && hash(x + 11, y + 5) > 0.93) fill = leaf.light;
        put(x, y, fill);
      }
    }
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.05 + i * 0.15) + (id.length % 3) * 0.1;
      const px = Math.round(cx + Math.cos(a) * (rx + 1));
      const py = Math.round(cy + Math.sin(a) * (ry + 1));
      put(px, py, leaf.base); put(px - 1, py, leaf.light); put(px + 1, py, leaf.shade); put(px, py - 1, leaf.light);
    }
    // A heavy area is shedding: a few amber leaves on their way down.
    if (tones[id] === 'heavy') for (const [dx, dy] of [[-5, 3], [4, 7], [-1, 12]]) { put(cx + dx, cy + ry + dy, leaf.base); put(cx + dx + 1, cy + ry + dy, leaf.shade); }
  }

  const runs: Run[] = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const fill = grid.get(y * W + x);
      if (!fill) { x++; continue; }
      let w = 1;
      while (x + w < W && grid.get(y * W + x + w) === fill) w++;
      runs.push({ x, y, w, fill });
      x += w;
    }
  }
  return runs;
}

export function TreeScene({ loads, selected, onSelect, height }: { loads: DimensionLoad[]; selected?: Dimension; onSelect: (d: Dimension) => void; bare?: boolean; height?: number }) {
  const [box, setBox] = useState({ w: 340, h: height ?? 400 });
  const tones = Object.fromEntries(ORDERED.map(id => [id, loads.find(l => l.id === id)?.tone ?? 'calm'])) as Record<Dimension, Tone>;
  const key = ORDERED.map(id => tones[id]).join();
  const runs = useMemo(() => paint(tones), [key]);

  // Fit the whole tree, leaving room above it for the top label.
  const scale = Math.max(0.5, Math.min(box.w / (W * P), (box.h - 30) / (H * P)));
  const artW = W * P * scale;
  const artH = H * P * scale;
  const left = (box.w - artW) / 2;
  const top = Math.max(30, (box.h - artH) / 2);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={height ? { height } : { flex: 1 }}>
      <Svg width={artW} height={artH} viewBox={`0 0 ${W * P} ${H * P}`} style={{ position: 'absolute', left, top }} accessibilityLabel="Your load, shown as one tree with five branches">
        <Ellipse cx={160} cy={(BASE + 1.5) * P} rx={96} ry={7} fill={C.ink} opacity={0.05} />
        {runs.map((r, i) => <Rect key={i} x={r.x * P} y={r.y * P} width={r.w * P + 0.4} height={P + 0.4} fill={r.fill} />)}
        {ORDERED.map(id => {
          const c = CLUSTERS[id];
          return <Rect key={`hit-${id}`} x={(c.cx - c.rx) * P} y={(c.cy - c.ry) * P} width={c.rx * 2 * P} height={c.ry * 2 * P} fill="transparent" onPress={() => onSelect(id)} />;
        })}
      </Svg>

      {ORDERED.map(id => {
        const load = loads.find(l => l.id === id);
        if (!load) return null;
        const c = CLUSTERS[id];
        const x = left + c.cx * P * scale;
        const y = top + c.cy * P * scale;
        const active = selected === id;
        // Labels sit just outside their canopy — above the crown, below the side clusters — never on the leaves.
        const below = top + (c.cy + c.ry) * P * scale + 6;
        const placement = c.side === 'top'
          ? { left: x - 52, width: 104, top: Math.max(0, top + (c.cy - c.ry) * P * scale - 42) }
          : c.side === 'left' ? { left: Math.max(2, x - 54), width: 108, top: below } : { left: Math.min(box.w - 110, x - 54), width: 108, top: below };
        const isMod = load.tone === 'moderate';
        const isHvy = load.tone === 'heavy';
        const toneColor = isHvy ? C.heavy : isMod ? C.amber : C.green;
        const badgeBg = active ? (isHvy ? '#FCEDE3' : isMod ? '#FCF5EA' : C.white) : (isMod ? '#FFFCF5' : C.white);
        const badgeBorder = active ? (isHvy ? C.heavy : isMod ? C.amber : C.moss) : (isMod ? '#E8D4A8' : isHvy ? '#E8B99D' : C.line);
        return (
          <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${load.label} load ${load.score} out of 100`}
            onPress={() => onSelect(id)} hitSlop={4}
            style={({ pressed }) => ({ position: 'absolute', minHeight: 36, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: badgeBorder, backgroundColor: badgeBg, opacity: pressed ? 0.7 : 1, ...placement })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: TONE[load.tone] }} />
              <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: '600' }}>{load.label}</Txt>
              <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: '800', color: toneColor }}>{load.score}</Txt>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
