import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { AppState, Commitment, Task, addDays, dateLabel, duration, remaining } from './model';
import { Chip as ChipType, Draft, Message, Review, TaskCard, converse, opening, respond, say, settle } from './chat';
import { Outcome, planRequest } from './flow';
import { aiConfigured, extractDraft } from './extract';
import { C, Chip, Icon, S, STEP_COLORS, Txt } from './ui';
import { PixelLeaf } from './Pixel';

const KEY = 'loadtree-chat-v2';

/** Chat history lives beside the plan, not inside it — the planner schema stays untouched. */
const WORD_MS = 38;
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

export function useChat(reduceMotion = false) {
  const [messages, setMessages] = useState<Message[]>(opening);
  const [draft, setDraft] = useState<Draft>({});
  const [thinking, setThinking] = useState(false);
  const [ready, setReady] = useState(false);
  // The latest plan the student can open on the calendar. Nothing opens until they ask.
  const [offer, setOffer] = useState<Outcome | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (!active || !raw) return;
        const saved = JSON.parse(raw) as { messages?: Message[]; draft?: Draft };
        if (Array.isArray(saved.messages) && saved.messages.length) setMessages(saved.messages);
        if (saved.draft) setDraft(saved.draft);
      })
      .catch(() => {})
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify({ messages: messages.slice(-80), draft })).catch(() => {}); }, 150);
    return () => clearTimeout(timer);
  }, [messages, draft, ready]);

  // The message currently being "typed" word by word; its chips and cards wait until it finishes.
  const [live, setLive] = useState<string | null>(null);

  /** Adds replies the way a person would: a short think, then the words arrive one by one. */
  const reveal = async (list: Message[]) => {
    for (const message of list) {
      if (message.role !== 'assistant' || reduceMotion) { setMessages(prev => [...prev, message]); continue; }
      setThinking(true);
      await wait(550 + Math.min(900, message.text.length * 8));
      setThinking(false);
      setLive(message.id);
      setMessages(prev => [...prev, message]);
      await wait(wordCount(message.text) * WORD_MS + 250);
      setLive(null);
    }
  };

  /** Something the app wants on the record, e.g. what was applied. */
  const note = (text: string, extra: Partial<Message> = {}) => { reveal([say('assistant', text, extra)]); };
  const aside = (userText: string, reply: string) => { reveal([say('user', userText), say('assistant', reply)]); };

  /** `shown` is what appears in the thread when a button speaks for the student. */
  const send = async (state: AppState, text: string, shown?: string): Promise<Outcome | undefined> => {
    const clean = text.trim();
    if (!clean) return;
    setMessages(prev => [...prev, say('user', shown ?? clean)]);
    let turn = converse(state, draft, clean);
    // Optional model assist, only for a fresh task the local reader could not finish.
    if (aiConfigured() && !draft.awaiting && !turn.ready && turn.draft.awaiting !== 'confirm' && turn.draft.title && !turn.draft.commitment && !turn.draft.event) {
      setThinking(true);
      const remote = await extractDraft(clean, state.now);
      setThinking(false);
      if (remote?.title && remote.deadline && remote.steps?.length) turn = settle(state, { title: remote.title, deadline: remote.deadline, steps: remote.steps });
    }
    await reveal(turn.messages);
    if (!turn.ready) { setDraft(turn.draft); return; }
    // Once agreed, the review keeps only the subtasks that were actually planned.
    const planned = turn.ready.task;
    if (draft.awaiting === 'confirm' && draft.skip?.length) {
      setMessages(all => {
        const i = all.map(m => !!m.review).lastIndexOf(true);
        if (i < 0) return all;
        const next = [...all];
        next[i] = { ...next[i], review: { ...next[i].review, task: planned } };
        return next;
      });
    }
    const outcome = planRequest(state, turn.ready);
    const answer = respond(state, outcome);
    setDraft(answer.draft);
    await reveal([answer.message]);
    setOffer(outcome.kind === 'fits' || outcome.kind === 'options' ? outcome : null);
    return outcome;
  };

  /** "Go back and edit items": the last review becomes editable again, exactly as it was. */
  const reopen = () => {
    const last = [...messages].reverse().find(m => m.review);
    if (last?.review) setDraft({ proposal: last.review, awaiting: 'confirm' });
  };

  /** Changes an item under review in place: the card updates, and so does what will be planned. */
  const amend = (patch: Review) => {
    setDraft(d => ({ ...d, proposal: { ...d.proposal, ...patch } }));
    setMessages(all => {
      const i = all.map(m => !!m.review).lastIndexOf(true);
      if (i < 0) return all;
      const next = [...all];
      next[i] = { ...next[i], review: { ...next[i].review, ...patch } };
      return next;
    });
  };
  const toggleSkip = (stepId: string) => setDraft(d => ({ ...d, skip: d.skip?.includes(stepId) ? d.skip.filter(x => x !== stepId) : [...(d.skip || []), stepId] }));

  const clear = () => { setMessages(opening()); setDraft({}); setOffer(null); AsyncStorage.removeItem(KEY).catch(() => {}); };

  return { messages, draft, thinking, live, offer, send, amend, toggleSkip, reopen, note, aside, clear, clearOffer: () => setOffer(null) };
}

/** Text that arrives word by word while `live`, like a reply being written; otherwise shown whole. */
function StreamText({ text, live, style }: { text: string; live: boolean; style: object }) {
  const tokens = text.split(/(\s+)/);
  const [count, setCount] = useState(live ? 0 : tokens.length);
  useEffect(() => {
    if (!live) { setCount(tokens.length); return; }
    setCount(0);
    let shown = 0;
    const timer = setInterval(() => { shown += 2; setCount(shown); if (shown >= tokens.length) clearInterval(timer); }, WORD_MS);
    return () => clearInterval(timer);
  }, [live, text]);
  return <Txt style={style}>{tokens.slice(0, count).join('')}</Txt>;
}

/** Three dots that pulse while LoadTree is "thinking". */
function ThinkingDots() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View accessibilityLabel="Thinking" style={{ flexDirection: 'row', gap: 6, paddingVertical: 8, paddingLeft: 4 }}>
      {[0, 1, 2].map(i => <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.moss,
        opacity: pulse.interpolate({ inputRange: [0, (i + 0.5) / 4, (i + 1.5) / 4, 1], outputRange: [0.25, 1, 0.25, 0.25] }) }} />)}
    </View>
  );
}

/** Cards fade and rise in once the words above them have finished. */
function FadeIn({ children, style }: { children: React.ReactNode; style?: object }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(t, { toValue: 1, duration: 320, useNativeDriver: true }).start(); }, [t]);
  return <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}

/** Older conversations saved before the review screen existed still show their breakdown. */
function Card({ card }: { card: TaskCard }) {
  return (
    <View style={{ width: '92%', gap: 10, paddingLeft: 2 }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <PixelLeaf size={13} />
          <Txt style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>{card.title}</Txt>
        </View>
        <Txt muted style={{ fontSize: 13 }}>{card.due} · {card.total} · {card.steps.length} steps</Txt>
      </View>
      {card.steps.map((step, i) => {
        const tone = STEP_COLORS[i % STEP_COLORS.length];
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 12, lineHeight: 15, fontWeight: '800', color: tone.fg }}>{i + 1}</Txt>
            </View>
            <Txt style={{ flex: 1, fontSize: 14.5 }}>{step.title}</Txt>
            <Txt style={{ fontSize: 13, fontWeight: '700', color: tone.fg }}>{duration(step.minutes)}</Txt>
          </View>
        );
      })}
    </View>
  );
}

// ---------- the brain-dump review ----------

const hour12 = (m: number) => { const h = Math.floor(m / 60) % 24; const mm = m % 60; return `${((h + 11) % 12) + 1}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`; };
const half = (m: number) => (Math.floor(m / 60) % 24 < 12 ? 'AM' : 'PM');
/** "6–10 PM", or "11 AM – 2 PM" when the range crosses noon — short enough to stay on one line. */
const span12 = (start: number, end: number) => (half(start) === half(end) ? `${hour12(start)}–${hour12(end)} ${half(end)}` : `${hour12(start)} ${half(start)} – ${hour12(end)} ${half(end)}`);
const AREA: Record<string, string> = { mental: 'Academic', physical: 'Physical', social: 'Social', errands: 'Errands', time: 'Time' };
const KIND: Record<Commitment['kind'], string> = { fixed: 'Fixed · never moved', flexible: 'Flexible · may move to make room', recovery: 'Rest · never used for study' };
const eventTitle = (c: Commitment) => (c.title === 'Work' ? 'Work shift' : c.title);
const eventTag = (c: Commitment) => (c.title === 'Work' ? 'Work' : AREA[c.dimension] ?? 'Event');

/** One understood item: what it is at a glance, with Edit and a chevron to see its details. */
function ItemCard({ icon, title, sub, tag, open, onToggle, onEdit, children }: { icon: string; title: string; sub: string; tag: string; open: boolean; onToggle: () => void; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={22} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontSize: 16.5, lineHeight: 22, fontWeight: '800' }}>{title}</Txt>
          <Txt muted style={{ fontSize: 13 }}>{sub}</Txt>
          <View style={{ alignSelf: 'flex-start', marginTop: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: C.surface }}>
            <Txt style={{ fontSize: 12, lineHeight: 16, color: C.muted, fontWeight: '600' }}>{tag}</Txt>
          </View>
        </View>
        {onEdit && <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${title}`} onPress={onEdit}
          style={({ pressed }) => ({ alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 16, backgroundColor: pressed ? C.line : C.sage })}>
          <Txt style={{ color: C.green, fontWeight: '700', fontSize: 13.5 }}>Edit</Txt>
        </Pressable>}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={open ? `Hide ${title} details` : `Show ${title} details`} onPress={onToggle} hitSlop={8}
          style={{ alignSelf: 'flex-start', padding: 8, transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="forward" size={18} />
        </Pressable>
      </View>
      {open && children}
    </View>
  );
}

function ReviewBlock({ message, active, skip, live, now, onToggleStep, onEditTask, onEditEvent, onContinue }: {
  message: Message; active: boolean; skip: string[]; live: boolean; now: string;
  onToggleStep: (id: string) => void; onEditTask: (t: Task) => void; onEditEvent: (c: Commitment) => void; onContinue: () => void;
}) {
  const { task, commitment } = message.review!;
  const [open, setOpen] = useState<'task' | 'event' | null>(task ? 'task' : 'event');
  const kept = task ? task.steps.filter(s => !skip.includes(s.id)).reduce((sum, s) => sum + s.remaining, 0) : 0;
  // Long projects: the weekly load, and a target date for each step, paced evenly to the deadline.
  // Whole calendar days from today to the due date, so no target ever lands after the deadline.
  const spanDays = task ? Math.max(1, Math.round((Date.parse(`${task.deadline.slice(0, 10)}T12:00:00Z`) - Date.parse(`${now.slice(0, 10)}T12:00:00Z`)) / 86400000)) : 0;
  const long = spanDays > 7;
  const perWeek = task && long ? Math.round(remaining(task) / (spanDays / 7) / 15) * 15 : 0;
  const targets = new Map<string, string>();
  if (task && long) {
    const total = remaining(task) || 1;
    let done = 0;
    for (const s of task.steps) { done += s.remaining; targets.set(s.id, addDays(now.slice(0, 10), Math.max(1, Math.round((done / total) * spanDays)))); }
  }
  return (
    <View style={{ width: '100%', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkle" size={22} color={C.moss} /></View>
        <View style={{ flex: 1 }}>
          <StreamText text={message.text} live={live} style={{ fontSize: 17, lineHeight: 23, fontWeight: '800' }} />
          <Txt muted style={{ fontSize: 13 }}>Edit anything before it goes on your calendar.</Txt>
        </View>
      </View>

      {!live && <FadeIn style={{ gap: 12 }}>
      {task && <ItemCard icon="doc" title={task.title} sub={`Due ${dateLabel(task.deadline)} · ~${duration(remaining(task))}${long ? ` · ≈${duration(perWeek)} a week` : ''}`} tag={long ? 'Project' : 'Academic'}
        open={open === 'task'} onToggle={() => setOpen(open === 'task' ? null : 'task')} onEdit={active ? () => onEditTask(task) : undefined}>
        <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 12, gap: 2 }}>
          <Txt style={{ fontSize: 13.5, fontWeight: '700', marginBottom: 4 }}>Suggested subtasks ({duration(active ? kept : remaining(task))})</Txt>
          {task.steps.map(step => {
            const on = !skip.includes(step.id);
            return <Pressable key={step.id} disabled={!active} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: !active }} accessibilityLabel={`${step.title}, ${duration(step.remaining)}`}
              onPress={() => onToggleStep(step.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 38 }}>
              <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: on ? C.green : C.muted, backgroundColor: on ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on && <Icon name="check" size={14} color={C.white} />}
              </View>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontSize: 14, color: on ? C.ink : C.muted, textDecorationLine: on ? 'none' : 'line-through' }}>{step.title}</Txt>
                {(targets.has(step.id) || step.optional) && <Txt muted style={{ fontSize: 11.5, lineHeight: 15 }}>
                  {[targets.has(step.id) ? `by ${dateLabel(targets.get(step.id)!)}` : '', step.optional ? 'optional' : ''].filter(Boolean).join(' · ')}
                </Txt>}
              </View>
              <Txt muted style={{ fontSize: 13 }}>{duration(step.remaining)}</Txt>
            </Pressable>;
          })}
          {active && <Pressable accessibilityRole="button" onPress={() => onEditTask(task)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: pressed ? C.line : C.white })}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.moss, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={14} color={C.white} /></View>
            <Txt style={{ color: C.green, fontWeight: '600', fontSize: 14 }}>Add subtask</Txt>
          </Pressable>}
        </View>
      </ItemCard>}

      {commitment && <ItemCard icon="bag" title={eventTitle(commitment)} sub={`${dateLabel(commitment.date)} · ${span12(commitment.start, commitment.end)}`} tag={eventTag(commitment)}
        open={open === 'event'} onToggle={() => setOpen(open === 'event' ? null : 'event')} onEdit={active ? () => onEditEvent(commitment) : undefined}>
        <Txt muted style={{ fontSize: 13.5, paddingLeft: 58 }}>{KIND[commitment.kind]}</Txt>
      </ItemCard>}

      {active && <>
        <Pressable accessibilityRole="button" onPress={onContinue}
          style={({ pressed }) => ({ minHeight: 54, marginTop: 4, borderRadius: 18, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: pressed ? 0.85 : 1 })}>
          <Txt style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>Looks good, continue</Txt>
          <Icon name="arrow" size={20} color={C.white} />
        </Pressable>
      </>}
      </FadeIn>}
    </View>
  );
}

type ReviewActions = { onToggleStep: (id: string) => void; onEditTask: (t: Task) => void; onEditEvent: (c: Commitment) => void; onContinue: () => void };

function Bubble({ message, onChip, active, skip, actions, live, now }: { message: Message; onChip: (chip: ChipType) => void; active: boolean; skip: string[]; actions: ReviewActions; live: boolean; now: string }) {
  const mine = message.role === 'user';
  if (message.review) return <ReviewBlock message={message} active={active} skip={active ? skip : []} live={live} now={now} {...actions} />;
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 10 }}>
      {!!message.text && (mine
        // What the student said, as a soft note — the brain-dump they are handing over.
        ? <View style={{ maxWidth: '88%', backgroundColor: C.sage, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Txt style={{ fontSize: 15, lineHeight: 22 }}>{message.text}</Txt>
          </View>
        // The assistant speaks in plain text, like a note — no bubble.
        : <StreamText text={message.text} live={live} style={{ maxWidth: '92%', fontSize: 15, lineHeight: 22, paddingLeft: 2 }} />)}
      {message.card && <Card card={message.card} />}
      {/* Chips appear once the words are done, the way a person finishes speaking before offering choices. */}
      {!live && !!message.chips?.length && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {message.chips.map((chip, i) => <Chip key={chip.label} active={chip.action === 'calendar' || (i === 0 && /^(Looks right|Yes)/.test(chip.label))} icon={chip.action === 'calendar' ? 'calendar' : chip.action === 'edit' ? 'settings' : undefined} onPress={() => onChip(chip)}>{chip.label}</Chip>)}
        </View>
      )}
    </View>
  );
}

export function ChatScreen({ chat, onChip, onClose, now, ...actions }: { chat: ReturnType<typeof useChat>; onChip: (chip: ChipType) => void; onClose: () => void; now: string } & Omit<ReviewActions, 'onToggleStep'>) {
  const scroller = useRef<ScrollView>(null);
  // Only the newest review, while it is still waiting for an answer, can be edited.
  const activeReview = chat.draft.awaiting === 'confirm' ? [...chat.messages].reverse().find(m => m.review)?.id : undefined;
  const all: ReviewActions = { ...actions, onToggleStep: chat.toggleSkip };
  return (
    <View style={{ flex: 1 }}>
      <View style={[S.between, { paddingHorizontal: 18, paddingBottom: 10 }]}>
        <View style={S.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={20} />
          </Pressable>
          <View>
            <Txt accessibilityRole="header" style={{ fontSize: 19, fontWeight: '800', color: C.ink, letterSpacing: -0.3 }}>Plan with LoadTree</Txt>
            <Txt muted style={{ fontSize: 12.5 }}>Turn your thoughts into a clear plan</Txt>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Clear this conversation" onPress={chat.clear} style={{ padding: 10 }}>
          <Icon name="undo" size={18} color={C.muted} />
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20, gap: 18 }}
        style={{ flex: 1 }}
      >
        {chat.messages.map(message => <Bubble key={message.id} message={message} onChip={onChip} active={message.id === activeReview} skip={chat.draft.skip || []} actions={all} live={message.id === chat.live} now={now} />)}
        {chat.thinking && <ThinkingDots />}
      </ScrollView>
    </View>
  );
}
