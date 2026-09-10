import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { C } from './ui';

// The tree's visual language, in miniature: a five-pixel geometric leaf.
const LEAF = ['...##', '..###', '.###.', '###..', '#....'];

export function PixelLeaf({ size = 12, color = C.moss }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 5 5">
    {LEAF.flatMap((row, y) => [...row].map((ch, x) => ch === '#'
      // The lower-right half is a touch darker, the same way the tree is lit.
      ? <Rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={color} opacity={x + y > 4 ? 0.7 : 1} />
      : null))}
  </Svg>;
}

const PIECES = [{ x: -38, y: -58, r: -40 }, { x: -16, y: -80, r: 25 }, { x: 6, y: -64, r: -15 }, { x: 24, y: -86, r: 40 }, { x: 42, y: -52, r: -30 }, { x: -46, y: -30, r: 30 }, { x: 34, y: -26, r: -45 }];

/** A small puff of pixel leaves — played once when something is finished. */
export function LeafBurst({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.timing(t, { toValue: 1, duration: 1200, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, t]);
  if (reduceMotion) return null;
  const colors = [C.moss, C.physical, C.flag];
  return <View pointerEvents="none" style={{ width: 1, height: 1 }}>
    {PIECES.map((p, i) => <Animated.View key={i} style={{
      position: 'absolute', left: -7, top: -7,
      opacity: t.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
        { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.y] }) },
        { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.r}deg`] }) },
      ],
    }}><PixelLeaf size={14} color={colors[i % colors.length]} /></Animated.View>)}
  </View>;
}
