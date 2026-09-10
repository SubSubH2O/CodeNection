import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, ScrollView, View } from 'react-native';
import { AppState, Task, duration } from './model';
import { Chip as ChipType, Draft, Message, TaskCard, converse, opening, respond, revise as reviseTurn, say, settle } from './chat';
import { Outcome, planRequest } from './flow';
import { aiConfigured, extractDraft } from './extract';
import { C, Chip, Icon, S, STEP_COLORS, Txt } from './ui';
import { PixelLeaf } from './Pixel';

const KEY = 'loadtree-chat-v2';

/** Chat history lives beside the plan, not inside it — the planner schema stays untouched. */
export function useChat() {
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

  /** Something the app wants on the record, e.g. what was applied. */
  const note = (text: string, extra: Partial<Message> = {}) => setMessages(prev => [...prev, say('assistant', text, extra)]);
  const aside = (userText: string, reply: string) => setMessages(prev => [...prev, say('user', userText), say('assistant', reply)]);

  const send = async (state: AppState, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setMessages(prev => [...prev, say('user', clean)]);
    let turn = converse(state, draft, clean);
    // Optional model assist, only for a fresh task the local reader could not finish.
    if (aiConfigured() && !draft.awaiting && !turn.ready && turn.draft.awaiting !== 'confirm' && turn.draft.title && !turn.draft.commitment && !turn.draft.event) {
      setThinking(true);
      const remote = await extractDraft(clean, state.now);
      setThinking(false);
      if (remote?.title && remote.deadline && remote.steps?.length) turn = settle(state, { title: remote.title, deadline: remote.deadline, steps: remote.steps });
    }
    setMessages(prev => [...prev, ...turn.messages]);
    if (!turn.ready) { setDraft(turn.draft); return; }
    const outcome = planRequest(state, turn.ready);
    const answer = respond(state, outcome);
    setMessages(prev => [...prev, answer.message]);
    setDraft(answer.draft);
    setOffer(outcome.kind === 'fits' || outcome.kind === 'options' ? outcome : null);
  };

  /** The student edited the steps by hand. */
  const revise = (state: AppState, task: Task) => {
    const turn = reviseTurn(state, draft, task);
    setMessages(prev => [...prev, say('user', 'Edited the steps'), ...turn.messages]);
    setDraft(turn.draft);
  };

  const clear = () => { setMessages(opening()); setDraft({}); setOffer(null); AsyncStorage.removeItem(KEY).catch(() => {}); };

  return { messages, draft, thinking, offer, send, revise, note, aside, clear, clearOffer: () => setOffer(null) };
}

/** The breakdown moment: a task becomes steps. No box — spacing and colour carry it. */
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

function Bubble({ message, onChip }: { message: Message; onChip: (chip: ChipType) => void }) {
  const mine = message.role === 'user';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 10 }}>
      {!!message.text && (mine
        ? <View style={{ maxWidth: '82%', backgroundColor: C.green, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 15, paddingVertical: 10 }}>
            <Txt style={{ fontSize: 14.5, lineHeight: 21, color: C.white }}>{message.text}</Txt>
          </View>
        // The assistant speaks in plain text, like a note — no bubble.
        : <Txt style={{ maxWidth: '92%', fontSize: 15, lineHeight: 22, paddingLeft: 2 }}>{message.text}</Txt>)}
      {message.card && <Card card={message.card} />}
      {!!message.chips?.length && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {message.chips.map((chip, i) => <Chip key={chip.label} active={chip.action === 'calendar' || (i === 0 && /^(Looks right|Yes)/.test(chip.label))} icon={chip.action === 'calendar' ? 'calendar' : chip.action === 'edit' ? 'settings' : undefined} onPress={() => onChip(chip)}>{chip.label}</Chip>)}
        </View>
      )}
    </View>
  );
}

export function ChatScreen({ chat, onChip, onClose }: { chat: ReturnType<typeof useChat>; onChip: (chip: ChipType) => void; onClose: () => void }) {
  const scroller = useRef<ScrollView>(null);
  return (
    <View style={{ flex: 1 }}>
      <View style={[S.between, { paddingHorizontal: 18, paddingBottom: 10 }]}>
        <View style={S.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={20} />
          </Pressable>
          <View>
            <Txt accessibilityRole="header" style={{ fontSize: 18, fontWeight: '800', color: C.green, letterSpacing: -0.3 }}>Plan with LoadTree</Txt>
            <Txt muted style={{ fontSize: 11.5 }}>Nothing changes until you confirm</Txt>
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
        {chat.messages.map(message => <Bubble key={message.id} message={message} onChip={onChip} />)}
        {chat.thinking && <Txt muted style={{ fontSize: 14 }}>Reading that…</Txt>}
      </ScrollView>
    </View>
  );
}
