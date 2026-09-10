import React from 'react';
import { AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// One calm green brand colour; categories are muted mid-tones of equal weight, so nothing shouts
// (the approach Todoist, Notion and Things take: colour marks meaning, neutrals do the rest).
export const C = {
  paper: '#FFFFFF', white: '#FFFFFF', surface: '#F4F7F6', sage: '#E6F2ED', line: '#E3EAE7', track: '#EAF0ED',
  green: '#166B55', greenDark: '#0E4F40', ink: '#1D302A', muted: '#718079',
  moss: '#4F9A72', calm: '#4F9A72',                        // completed / best
  amber: '#A8742F', amberBg: '#FBF2E3', mid: '#E0A64F', heavy: '#D7894F',
  flag: '#E0A64F', flagBg: '#FCF5EA',                      // proposed change
  red: '#CF5F5F', redBg: '#FBEDED',                        // deadline / danger
  teal: '#5F9FA1', tealBg: '#E7F2F2',                      // recovery
  study: '#5B7DBD', studyBg: '#EBF0F8', social: '#8B72C7', socialBg: '#F1EDF8',
  physical: '#5FAE83', physicalBg: '#E9F4EE', errands: '#D69B55', errandsBg: '#FAF0E3',
  neutralBar: '#CCD6D1',
  skyTop: '#D3E7EF', skyBottom: '#E8F2EF', meadow: '#BCDDB0', glass: 'rgba(255,255,255,0.78)', glassLine: 'rgba(255,255,255,0.85)',
};
/** Each part of life keeps one colour everywhere it appears. */
export const DIM_TONE: Record<string, { fg: string; bg: string }> = {
  study: { fg: C.study, bg: C.studyBg }, mental: { fg: C.study, bg: C.studyBg }, social: { fg: C.social, bg: C.socialBg },
  physical: { fg: C.physical, bg: C.physicalBg }, errands: { fg: C.errands, bg: C.errandsBg }, time: { fg: C.green, bg: C.sage },
  recovery: { fg: C.teal, bg: C.tealBg },
};
export const STEP_COLORS = [DIM_TONE.study, DIM_TONE.social, DIM_TONE.physical, DIM_TONE.errands, DIM_TONE.recovery];
// Native shadows and elevation also render on web; no platform-only blur dependency.
export const SOFT_SHADOW: ViewStyle = { shadowColor: '#286D57', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 2 };
export const LIFT_SHADOW: ViewStyle = { shadowColor: '#1B5B49', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 8 };
export const TONE = { calm: C.calm, moderate: C.mid, heavy: C.heavy };
export const S = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stack: { gap: 16 }, card: { backgroundColor: C.white, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#EDF4EF', ...SOFT_SHADOW },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 6 },
  label: { fontSize: 13, fontWeight: '600', color: C.muted },
});
export function Txt({ children, muted = false, style, ...props }: React.ComponentProps<typeof Text> & { muted?: boolean }) {
  return <Text {...props} style={[{ fontSize: 15, lineHeight: 22, color: muted ? C.muted : C.ink }, style]}>{children}</Text>;
}
export function Title({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return <Text accessibilityRole="header" style={{ flexShrink: 1, fontSize: small ? 21 : 29, lineHeight: small ? 27 : 35, fontWeight: '700', color: C.ink, letterSpacing: -0.6 }}>{children}</Text>;
}
export function Segmented<T extends string>({ value, onChange, options, accent = C.green, compact = false }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; accent?: string; compact?: boolean }) {
  return <View style={{ flexDirection: 'row', backgroundColor: '#E4EFE9', borderRadius: compact ? 18 : 28, padding: 4 }}>
    {options.map(o => <Pressable key={o.id} accessibilityRole="tab" accessibilityState={{ selected: value === o.id }} onPress={() => onChange(o.id)} style={({ pressed }) => ({ flex: compact ? undefined : 1, minHeight: 44, paddingHorizontal: compact ? 12 : 0, alignItems: 'center', justifyContent: 'center', borderRadius: compact ? 14 : 24, backgroundColor: value === o.id ? accent : 'transparent', opacity: pressed ? 0.75 : 1, ...(value === o.id ? SOFT_SHADOW : {}) })}>
      <Txt style={{ fontSize: compact ? 12.5 : 15, fontWeight: value === o.id ? '700' : '500', color: value === o.id ? C.white : C.muted }}>{o.label}</Txt>
    </Pressable>)}
  </View>;
}
export function Meter({ value, color }: { value: number; color: string }) {
  return <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: C.track, overflow: 'hidden' }}>
    <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: 10, borderRadius: 5, backgroundColor: color }} />
  </View>;
}
const paths: Record<string, string> = {
  leaf: 'M20 3C10 2 3 6 4 13c1 8 14 10 16-10ZM5 20 16 8',
  home: 'm3 10 9-7 9 7v10h-6v-7H9v7H3Z',
  calendar: 'M4 5h16v16H4ZM4 10h16M8 2v6M16 2v6M8 14h2M14 14h2M8 18h2',
  tasks: 'M9 5h12M9 12h12M9 19h12M2 5l2 2 3-4M2 12l2 2 3-4M2 19l2 2 3-4',
  plus: 'M12 4v16M4 12h16', back: 'm14 5-7 7 7 7', forward: 'm10 5 7 7-7 7', close: 'm6 6 12 12M18 6 6 18',
  check: 'm4 12 5 5L20 6', clock: 'M12 6v6l4 2', lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5ZM12 14v3',
  arrow: 'M4 12h16m-6-6 6 6-6 6', settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  mental: 'M12 5.2A3.2 3.2 0 0 0 6.3 4 2.7 2.7 0 0 0 4.2 7.2 2.8 2.8 0 0 0 4 12a2.9 2.9 0 0 0 .8 4.5A3 3 0 0 0 9 19.4a2.7 2.7 0 0 0 3-2.2ZM12 5.2A3.2 3.2 0 0 1 17.7 4a2.7 2.7 0 0 1 2.1 3.2A2.8 2.8 0 0 1 20 12a2.9 2.9 0 0 1-.8 4.5A3 3 0 0 1 15 19.4a2.7 2.7 0 0 1-3-2.2Z',
  social: 'M9.2 11.4a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2ZM2.8 19.6a6.4 6.4 0 0 1 12.8 0M16.2 5.5a3.1 3.1 0 0 1 0 5.8M17.4 14.4a5.6 5.6 0 0 1 3.8 5.2',
  physical: 'M4.2 9.4v5.2M7 7.2v9.6M17 7.2v9.6M19.8 9.4v5.2M7 12h10',
  errands: 'M2.6 4.2h2.6l2.5 10.6h9.6l2.1-8.2H6.2M9.4 20a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4ZM17.4 20a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z', undo: 'M4 9h10a6 6 0 1 1-5 11M4 9l5-5M4 9l5 5',
  person: 'M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM5 20.5a7 7 0 0 1 14 0',
  clip: 'M20 11.5 12.4 19a4.6 4.6 0 0 1-6.5-6.5l7.6-7.6a3 3 0 0 1 4.3 4.3l-7.5 7.5a1.5 1.5 0 0 1-2.1-2.1l6.9-6.9',
  mic: 'M12 3.5a2.8 2.8 0 0 1 2.8 2.8v5.4a2.8 2.8 0 0 1-5.6 0V6.3A2.8 2.8 0 0 1 12 3.5ZM5.5 11.2a6.5 6.5 0 0 0 13 0M12 17.7V21M9 21h6',
  send: 'M4.4 11.9 20 4.5l-7.4 15.6-1.8-6.4-6.4-1.8Z',
  stop: 'M7.5 7.5h9v9h-9Z',
  doc: 'M13.5 3H6.5v18h11V7ZM13.5 3v4h4M9 12h6M9 16h4',
  image: 'M4 5h16v14H4ZM4 15.5 9 11l4.5 4.5M13 14l2.5-2.5L20 16M15.5 8.5h.01',
  camera: 'M4 8h3l1.6-2.2h6.8L17 8h3v11H4ZM12 16.2a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z',
};
export function Icon({ name, color = C.green, size = 22 }: { name: string; color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round">
    {name === 'clock' && <Circle cx={12} cy={12} r={9} />}
    <Path d={paths[name] || paths.leaf} />
  </Svg>;
}
export function Avatar({ size = 42 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40">
    <Circle cx={20} cy={20} r={20} fill="#DCE7DA" />
    <Path d="M20 22.5c6.3 0 11.4 4.4 12.4 10.2A20 20 0 0 1 7.6 32.7C8.6 26.9 13.7 22.5 20 22.5Z" fill="#2F6B4F" />
    <Circle cx={20} cy={16.4} r={6.6} fill="#EFC08D" />
    <Path d="M13.3 15.6c-.4-4.3 2.6-7.4 6.7-7.4s7.1 3.1 6.7 7.4c-.9-1.7-2.1-2.6-3.4-2.8-1.9-.3-2.6.8-5 .5-1.9-.2-3.4.6-5 2.3Z" fill="#2E2A26" />
  </Svg>;
}
export function Glass({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ backgroundColor: C.glass, borderRadius: 16, borderWidth: 1, borderColor: C.glassLine, paddingHorizontal: 12, paddingVertical: 8 }, style]}>{children}</View>;
}
export function SplitBar({ parts }: { parts: { key: string; value: number; color: string }[] }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
  return <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: C.track }}>
    {parts.filter(p => p.value > 0).map(p => <View key={p.key} style={{ flex: p.value / total, backgroundColor: p.color }} />)}
  </View>;
}
export function Button({ children, onPress, kind = 'primary', disabled = false, icon, testID }: { children: string; onPress: () => void; kind?: 'primary' | 'outline' | 'quiet' | 'danger'; disabled?: boolean; icon?: string; testID?: string }) {
  const primary = kind === 'primary';
  const color = primary ? C.white : kind === 'danger' ? C.red : C.green;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => ({ minHeight: 50, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 15, borderWidth: kind === 'outline' ? 1 : 0, borderColor: C.line, backgroundColor: primary ? C.green : kind === 'danger' ? C.redBg : kind === 'outline' ? C.white : 'transparent', opacity: disabled ? 0.45 : pressed ? 0.75 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 })}>
    {icon && <Icon name={icon} color={color} size={19} />}<Txt style={{ color, fontWeight: '600', textAlign: 'center' }}>{children}</Txt>
  </Pressable>;
}
export function Chip({ children, active = false, onPress, icon, tone }: { children: string; active?: boolean; onPress?: () => void; icon?: string; tone?: 'amber' | 'teal' }) {
  const color = active ? C.white : tone === 'amber' ? C.amber : tone === 'teal' ? C.teal : C.green;
  const backgroundColor = active ? C.green : tone === 'amber' ? C.amberBg : tone === 'teal' ? C.tealBg : C.sage;
  const content = <>{icon && <Icon name={icon} size={15} color={color} />}<Txt style={{ color, fontSize: 12, lineHeight: 17, fontWeight: '600' }}>{children}</Txt></>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={{ backgroundColor, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 13, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>{content}</Pressable> : <View style={{ backgroundColor, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 9, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 }}>{content}</View>;
}
export function Field({ label, error, ...props }: React.ComponentProps<typeof TextInput> & { label: string; error?: string }) {
  return <View style={{ gap: 7 }}><Txt style={S.label}>{label}</Txt><TextInput {...props} accessibilityLabel={label} placeholderTextColor="#7A897E" style={[{ borderWidth: 1, borderColor: error ? C.red : C.line, backgroundColor: C.white, borderRadius: 12, minHeight: 49, padding: 12, fontSize: 16, color: C.ink }, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, props.style]} />{error && <Txt style={{ color: C.red, fontSize: 13 }}>{error}</Txt>}</View>;
}
export function Notice({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'amber' | 'red' }) {
  return <View accessibilityLiveRegion="polite" style={{ padding: 15, gap: 5, borderRadius: 14, backgroundColor: tone === 'amber' ? C.amberBg : tone === 'red' ? C.redBg : C.tealBg }}><Txt style={{ color: tone === 'amber' ? C.amber : tone === 'red' ? C.red : C.teal, fontSize: 14 }}>{children}</Txt></View>;
}
export function Page({ children }: { children: React.ReactNode }) {
  return <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: 28, gap: 22 }} style={{ flex: 1 }}>{children}</ScrollView>;
}
/** A white group of rows split by hairlines — one surface per group of related settings. */
export function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return <View style={{ gap: 8 }}>
    {title && <Txt style={{ fontSize: 13, fontWeight: '700', color: C.muted, paddingHorizontal: 4 }}>{title}</Txt>}
    <View style={{ backgroundColor: C.surface, borderRadius: 18, paddingHorizontal: 16 }}>
      {items.map((child, i) => <View key={i} style={i ? { borderTopWidth: 1, borderColor: C.line } : undefined}>{child}</View>)}
    </View>
  </View>;
}
/** One setting: label on the left, its value or control on the right. */
export function Row({ label, sub, value, right, onPress, danger = false, disabled = false }: { label: string; sub?: string; value?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean; disabled?: boolean }) {
  const body = <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: disabled ? 0.4 : 1 }}>
    <View style={{ flex: 1 }}>
      <Txt style={{ fontSize: 16, color: danger ? C.red : C.ink, fontWeight: danger ? '600' : '400' }}>{label}</Txt>
      {!!sub && <Txt muted style={{ fontSize: 13, lineHeight: 18 }}>{sub}</Txt>}
    </View>
    {!!value && <Txt muted style={{ fontSize: 14 }}>{value}</Txt>}
    {right}
    {onPress && !right && !danger && <Icon name="forward" size={16} color={C.muted} />}
  </View>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} accessibilityLabel={sub ? `${label}, ${sub}` : label} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>{body}</Pressable> : body;
}
/** An on/off switch, as in Google Calendar. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  // activeThumbColor/activeTrackColor are the web equivalents; native ignores them.
  const web = { activeThumbColor: C.white, activeTrackColor: C.green } as object;
  return <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: C.green, false: '#D3DDD8' }} thumbColor={C.white} ios_backgroundColor="#D3DDD8" {...web} />;
}
/** − value + : for times and amounts, so nobody has to type "18:00". */
export function Stepper({ value, label, onMinus, onPlus }: { value: string; label: string; onMinus: () => void; onPlus: () => void }) {
  const button = (sign: string, onPress: () => void, what: string) => <Pressable accessibilityRole="button" accessibilityLabel={`${what} ${label}`} onPress={onPress} hitSlop={6}
    style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.line : C.sage })}>
    <Txt style={{ fontSize: 20, lineHeight: 22, color: C.green, fontWeight: '600' }}>{sign}</Txt>
  </Pressable>;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    {button('−', onMinus, 'Decrease')}
    <Txt style={{ minWidth: 62, textAlign: 'center', fontSize: 16, fontWeight: '600' }}>{value}</Txt>
    {button('+', onPlus, 'Increase')}
  </View>;
}

export const MotionContext = React.createContext(false);
export function Sheet({ title, subtitle, children, onClose, footer, onSave }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode; onSave?: () => void }) {
  const reduceMotion = React.useContext(MotionContext);
  return <Modal visible animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose} transparent><View style={{ flex: 1, backgroundColor: 'rgba(18,39,28,.35)' }}><SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center', backgroundColor: C.paper }}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    {onSave
      // Editing screens: close on the left, the title in the middle, save on the right.
      ? <View style={[S.between, { paddingHorizontal: 8, paddingVertical: 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close without saving" onPress={onClose} style={{ padding: 12 }}><Icon name="close" size={24} color={C.ink} /></Pressable>
          <Txt accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' }}>{title}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Save" onPress={onSave} style={{ padding: 12 }}><Icon name="check" size={26} color={C.green} /></Pressable>
        </View>
      : <View style={{ paddingHorizontal: 22, paddingVertical: 16, borderBottomWidth: 1, borderColor: C.line, gap: 4 }}><View style={S.between}><Title small>{title}</Title><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ padding: 12, borderRadius: 24, backgroundColor: C.sage }}><Icon name="close" size={20} /></Pressable></View>{subtitle && <Txt muted style={{ fontSize: 13 }}>{subtitle}</Txt>}</View>}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 18, paddingBottom: 32 }}>{children}</ScrollView>
    {footer && <View style={{ padding: 18, gap: 9, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.paper }}>{footer}</View>}
  </KeyboardAvoidingView></SafeAreaView></View></Modal>;
}
