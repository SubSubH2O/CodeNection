import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, ScrollView, View } from 'react-native';
import { AppState, Candidate, dateLabel, duration, remaining } from './model';
import { Chip as ChipType, Draft, Message, OPENING, offerPlans, reply, say } from './chat';
import { aiConfigured, extractDraft } from './extract';
import { C, Chip, Icon, S, SOFT_SHADOW, Txt } from './ui';

const KEY = 'loadtree-chat-v1';

/** Chat history lives beside the plan, not inside it — the planner schema stays untouched. */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>(OPENING);
  const [draft, setDraft] = useState<Draft>({});
  const [ready, setReady] = useState(false);

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
    const timer = setTimeout(() => {
      // Plans hold a full schedule; they go stale, so only the words are kept.
      const slim = messages.slice(-60).map(({ plans, ...rest }) => rest);
      AsyncStorage.setItem(KEY, JSON.stringify({ messages: slim, draft })).catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, draft, ready]);

  const [thinking, setThinking] = useState(false);

  const local = (state: AppState, text: string) => {
    const turn = reply(state, draft, text);
    setMessages(prev => [...prev, ...turn.messages]);
    setDraft(turn.draft);
  };

  const send = async (state: AppState, text: string) => {
    setMessages(prev => [...prev, say('user', text)]);
    // Mid-answer replies stay local; only a fresh request is worth a model call.
    if (!aiConfigured() || draft.awaiting) { local(state, text); return; }
    setThinking(true);
    const remote = await extractDraft(text, state.now);
    setThinking(false);
    if (!remote) { local(state, text); return; }
    const plans = offerPlans(state, remote);
    const total = (remote.steps || []).reduce((sum, s) => sum + s.remaining, 0);
    setMessages(prev => [
      ...prev,
      say('assistant', `“${remote.title}” — ${remote.steps?.length} steps, about ${Math.round(total / 15) * 15} minutes in total.`),
      ...plans.messages,
    ]);
    setDraft(plans.draft);
  };
  const clear = () => { setMessages(OPENING); setDraft({}); AsyncStorage.removeItem(KEY).catch(() => {}); };

  return { messages, draft, send, clear, thinking };
}

function Bubble({ message, onChip, onPlan }: { message: Message; onChip: (c: ChipType) => void; onPlan: (p: Candidate, m: Message) => void }) {
  const mine = message.role === 'user';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 8 }}>
      <View style={{ maxWidth: '86%', backgroundColor: mine ? C.green : C.white, borderRadius: 20, borderBottomRightRadius: mine ? 6 : 20, borderBottomLeftRadius: mine ? 20 : 6, paddingHorizontal: 15, paddingVertical: 11, borderWidth: mine ? 0 : 1, borderColor: '#E6EFE9', ...SOFT_SHADOW }}>
        <Txt style={{ fontSize: 14.5, lineHeight: 21, color: mine ? C.white : C.ink }}>{message.text}</Txt>
      </View>

      {!!message.chips?.length && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {message.chips.map(chip => <Chip key={chip.label} onPress={() => onChip(chip)}>{chip.label}</Chip>)}
        </View>
      )}

      {message.plans?.map((plan, i) => (
        <Pressable key={plan.id} accessibilityRole="button" accessibilityLabel={`Preview ${plan.title}`} onPress={() => onPlan(plan, message)}
          style={{ width: '92%', backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: i === 0 ? '#AECFBB' : '#E6EFE9', padding: 16, gap: 9, ...SOFT_SHADOW }}>
          <View style={S.between}>
            <Chip>{i === 0 ? 'Suggested' : 'Another way'}</Chip>
            <Icon name={plan.movedId ? 'errands' : 'leaf'} size={18} />
          </View>
          <Txt style={{ fontSize: 16, fontWeight: '700' }}>{plan.title}</Txt>
          <Txt muted style={{ fontSize: 13 }}>{plan.description}</Txt>
          <View style={{ borderLeftWidth: 2, borderColor: C.flag, paddingLeft: 10, gap: 2 }}>
            <Txt style={{ fontSize: 11, fontWeight: '800', color: C.flag, letterSpacing: 0.3 }}>THE TRADE-OFF</Txt>
            <Txt style={{ fontSize: 13 }}>{plan.tradeOff}</Txt>
          </View>
          <View style={[S.row, { justifyContent: 'space-between' }]}>
            <View style={S.row}><Icon name="lock" size={15} /><Txt muted style={{ fontSize: 12 }}>Recovery protected</Txt></View>
            <Txt style={{ fontSize: 13, fontWeight: '700', color: C.green }}>Preview →</Txt>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function ChatScreen({ state, chat, onPlan, onClose }: {
  state: AppState;
  chat: ReturnType<typeof useChat>;
  onPlan: (plan: Candidate, task?: Message['task']) => void;
  onClose: () => void;
}) {
  const scroller = useRef<ScrollView>(null);
  return (
    <View style={{ flex: 1 }}>
      <View style={[S.between, { paddingHorizontal: 18, paddingBottom: 10 }]}>
        <View style={S.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to your tree" onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={20} />
          </Pressable>
          <View>
            <Txt accessibilityRole="header" style={{ fontSize: 18, fontWeight: '800', color: C.green, letterSpacing: -0.3 }}>Plan with LoadTree</Txt>
            <Txt muted style={{ fontSize: 11.5 }}>Prepared locally · nothing saved without your approval</Txt>
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 14 }}
        style={{ flex: 1 }}
      >
        {chat.messages.map(message => (
          <Bubble key={message.id} message={message}
            onChip={chip => chat.send(state, chip.send)}
            onPlan={(plan, m) => onPlan(plan, m.task)} />
        ))}
        {chat.thinking && <View style={{ alignSelf: 'flex-start', backgroundColor: C.white, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 15, paddingVertical: 11, borderWidth: 1, borderColor: '#E6EFE9' }}><Txt muted style={{ fontSize: 14 }}>Reading that…</Txt></View>}
      </ScrollView>
    </View>
  );
}
