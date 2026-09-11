import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, LayoutAnimation, Platform, Pressable, ScrollView, Switch, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LoadTreeProvider, useLoadTree } from './store';
import { reducer } from './state';
import { Candidate, Commitment, Dimension, Task, WEEK, dateLabel, duration, planState, remaining, stamp } from './model';
import { Avatar, C, Button, Chip, Group, Icon, MotionContext, Notice, Page, Row, S, Segmented, Sheet, SOFT_SHADOW, Title, Toggle, TONE, Txt } from './ui';
import { dayLoad, dayStatus, dimensionLoad, loadScores, summarise } from './load';

const VIEW_LABEL = { day: 'Day', week: 'Week', month: 'Month' } as const;
/** "Mon, 7 September" — or "Mon, 31 Aug" when space is shared with the Today button. */
const longDate = (d: string, short = false) => { const date = new Date(`${d}T12:00:00`); return `${date.toLocaleDateString('en-GB', { weekday: 'short' })}, ${date.getDate()} ${date.toLocaleDateString('en-GB', { month: short ? 'short' : 'long' })}`; };
import { HeroScene, LoadSummary } from './HeroScene';
import { TreeScene } from './TreeScene';
import { LeafBurst } from './Pixel';
import { CompareScreen, FitScreen } from './FlowScreens';
import { LoadDetail } from './LoadDetail';
import { Options, changesOf, choicesFor, describe, impactOf } from './impact';
import { Capture, InputBar, useKeyboardInset } from './InputBar';
import { Conflict } from './conflict';
import { OptionsPanel } from './OptionsPanel';
import { TaskSpine } from './TaskSpine';
import { RoutineEditor, commitmentsFor, groupCommitments, routineOf } from './RoutineEditor';
import { Setup } from './Setup';
import { DayTimeline, MonthHeader, MonthWeek, WeekAgenda, WeekStrip, changesOn, monthWeeks, planChanges } from './Calendar';
import { Progress, TaskEditor } from './TaskFlow';
import { futureCoverage, validatePlan } from './planner';
import { ChatScreen, useChat } from './ChatScreen';
import { Chip as ChatChip } from './chat';
import { Outcome, appliedSummary, planRequest, replan } from './flow';

type Tab = 'home' | 'calendar' | 'chat';
type Overlay =
  | { type: 'setup' | 'settings' | 'reset' | 'advance' }
  | { type: 'editor'; task?: Task; seed?: Task; fromChat?: boolean }
  | { type: 'compare'; draft?: Task }
  | { type: 'dimension'; dim: Dimension }
  | { type: 'detail'; id: string }
  | { type: 'progress'; id: string; stepId: string }
  | { type: 'delete'; id: string }
  | { type: 'newEvent'; start: number }
  | { type: 'editEvent'; id: string }
  | { type: 'chatEvent'; commitment: Commitment }
  | { type: 'noFit'; task?: Task; shortfall: number }
  | null;

function Application() {
  const { state, dispatch, ready, storageError } = useLoadTree();
  const [tab, setTab] = useState<Tab>('home');
  // Screens opened on top of each other form a stack, so closing one returns to the one beneath.
  const [stack, setStack] = useState<NonNullable<Overlay>[]>([]);
  const overlay: Overlay = stack[stack.length - 1] ?? null;
  const setOverlay = (next: Overlay) => setStack(prev => {
    if (!next) return [];
    // Returning to a screen already open (e.g. progress → detail) goes back to it rather than stacking a copy.
    const at = prev.findIndex(o => o.type === next.type);
    return at >= 0 ? [...prev.slice(0, at), next] : [...prev, next];
  });
  const [dimension, setDimension] = useState<Dimension | undefined>(undefined);
  const [day, setDay] = useState(WEEK[0]);
  const [toast, setToast] = useState('');
  // Bumped when something is finished; each bump plays one small burst of pixel leaves.
  const [burst, setBurst] = useState(0);
  // Bumped by "Add more items" to put the cursor back in the message box.
  const [focusKey, setFocusKey] = useState(0);
  // The fit check and the plan comparison, between the chat and the calendar preview.
  const [flow, setFlow] = useState<{ outcome: Options; options: Candidate[]; step: 'fit' | 'compare'; index: number } | null>(null);
  // Where Cancel on the calendar preview returns to.
  const [previewFrom, setPreviewFrom] = useState<'compare' | 'chat' | 'app'>('app');
  const [barOpen, setBarOpen] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [completedFilter, setCompletedFilter] = useState(false);
  const [pending, setPending] = useState<Candidate | null>(null);
  const [previewing, setPreviewing] = useState(true);
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [viewMenu, setViewMenu] = useState(false);
  const [compare, setCompare] = useState<{ conflict?: Conflict; subject?: string; options: Candidate[] } | null>(null);
  const [optionIndex, setOptionIndex] = useState(0);
  // Where the proposal on screen came from, so the chat can record what happened to it.
  const [origin, setOrigin] = useState<'chat' | 'app'>('app');
  const sequence = useRef(0);
  const lastTab = useRef<Tab>('home');
  const [focus, setFocus] = useState<{ date: string; start: number; blockId?: string; nonce: number } | null>(null);
  const calendarScroll = useRef<ScrollView>(null);
  // Where the day timeline starts inside the scroll view (below the month rows in month view).
  const timelineTop = useRef(0);
  const [localReduceMotion, setLocalReduceMotion] = useState(false);
  const systemReduceMotion = reduceMotion;
  const motionOff = systemReduceMotion || localReduceMotion;
  const { height: screenHeight } = useWindowDimensions();
  // Rows that do not differ are hidden, so the panel can stay short and leave the calendar visible.
  const panelHeight = Math.min(340, Math.max(280, screenHeight * 0.4));
  const keyboard = useKeyboardInset();
  const chat = useChat(motionOff);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 6000); return () => clearTimeout(timeout); }, [toast]);

  const close = () => setStack(prev => prev.slice(0, -1));
  const loads = loadScores(state);
  const active = state.tasks.filter(t => remaining(t) > 0);
  const completed = state.tasks.filter(t => remaining(t) === 0);
  const nextTask = [...active].sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  const nextStep = nextTask?.steps.find(s => s.remaining > 0);
  const totalRemaining = active.reduce((sum, t) => sum + remaining(t), 0);
  const coverage = active.reduce((sum, t) => sum + futureCoverage(state, t), 0);
  const needsPlan = active.length > 0 && validatePlan(state, state.tasks, state.commitments, state.blocks).length > 0;
  const detailTask = overlay && (overlay.type === 'detail' || overlay.type === 'progress' || overlay.type === 'delete') ? state.tasks.find(t => t.id === overlay.id) : undefined;
  const stale = !!pending && (pending.sourceRevision !== state.revision || validatePlan(planState(state, pending), pending.tasks, pending.commitments, pending.blocks).length > 0);
  const changes = planChanges(state, pending);
  const blankChanges = { added: [], removed: [], moved: [], total: 0, days: new Set<string>() };
  const shownPlan = previewing && pending?.sourceRevision === state.revision ? pending : null;
  const onCalendar = tab === 'calendar';

  const openChat = () => { if (tab !== 'chat') lastTab.current = tab; setTab('chat'); };
  const leaveChat = () => setTab(lastTab.current === 'chat' ? 'home' : lastTab.current);
  const undo = () => { dispatch({ type: 'undo' }); setToast('Previous state restored.'); };

  const discard = () => {
    const had = !!(pending || compare);
    setCompare(null); setPending(null); setPreviewing(true);
    // Cancelling a plan picked from the comparison goes back to the comparison, not to the start.
    if (previewFrom === 'compare' && flow) { setPreviewFrom('app'); setTab('chat'); return; }
    if (had && origin === 'chat') chat.note('Cancelled — your calendar is unchanged.');
    setToast('Cancelled. Your calendar is unchanged.');
  };
  const approve = () => {
    if (!pending || stale) return;
    if (pending.id === 'keep') {
      setCompare(null); setPending(null);
      if (origin === 'chat') chat.note('Kept your week as it was — nothing added.');
      setToast('Kept your week as it was.');
      return;
    }
    const summary = appliedSummary(state, pending);
    if (!motionOff && Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    dispatch({ type: 'approve', plan: pending });
    setPending(null);
    setCompare(null);
    setFlow(null);
    setPreviewFrom('app');
    if (origin === 'chat') { chat.note(summary); chat.clearOffer(); }
    setToast(summary);
    setBurst(b => b + 1);
  };

  /** Opens the calendar at a time. `keepView` stays in week or month view instead of switching to the day. */
  const jump = (date: string, start: number, blockId?: string, keepView = false) => {
    setDay(date); setTab('calendar'); setViewMenu(false);
    if (keepView && view !== 'day') { setFocus(null); return; }
    setView('day'); setFocus({ date, start, blockId, nonce: ++sequence.current });
  };
  const focusPlan = (option: Candidate, date?: string, keepView = false) => {
    const shift = planChanges(state, option);
    const target = date || shift.moved[0]?.before.date || shift.removed[0]?.date || shift.added[0]?.date || day;
    const rows = [...shift.added, ...shift.removed, ...shift.moved.map(m => m.now), ...shift.moved.map(m => m.before)].filter(b => b.date === target).sort((a, b) => a.start - b.start);
    jump(target, rows[0]?.start ?? option.blocks.find(b => b.date === target)?.start ?? 1080, undefined, keepView);
  };
  const showOptions = (options: Candidate[], conflict?: Conflict, subject?: string) => {
    if (!options.length) return;
    setCompare({ options, conflict, subject }); setOptionIndex(0); setPending(options[0]); setPreviewing(true); focusPlan(options[0]);
  };

  /** Puts a planning outcome on the calendar: one proposal if it fits, a comparison if it does not. */
  const present = (outcome: Outcome, from: 'chat' | 'app') => {
    setOrigin(from);
    const subject = outcome.request.commitment?.title ?? outcome.request.task?.title;
    if (outcome.kind === 'fits') { setCompare(null); setPending(outcome.plan); setPreviewing(true); focusPlan(outcome.plan); return; }
    if (outcome.kind === 'options') { showOptions(outcome.options, outcome.conflict, subject); return; }
    if (outcome.kind === 'none') setOverlay({ type: 'noFit', task: outcome.request.task, shortfall: outcome.shortfall });
  };
  /** After "Looks good, continue": if it fits, straight to the calendar preview; if not, the fit check first. */
  const openOutcome = (outcome: Outcome) => {
    if (outcome.kind === 'options') {
      const options = choicesFor(state, outcome);
      if (options.length) { setFlow({ outcome, options, step: 'fit', index: 0 }); return; }
    }
    setPreviewFrom('chat');
    setBarOpen(true);
    present(outcome, 'chat');
  };
  /** "Preview this plan": the chosen plan goes on the calendar in amber, nothing saved yet. */
  const previewChoice = (i: number, keepView = false) => {
    if (!flow) return;
    const option = flow.options[i];
    setFlow({ ...flow, index: i });
    setOrigin('chat');
    setPreviewFrom('compare');
    setCompare(null); setPending(option); setPreviewing(true); setBarOpen(true);
    focusPlan(option, undefined, keepView);
  };
  /** "Go back and edit items": back to the review, still editable. */
  const editItems = () => { setFlow(null); chat.reopen(); setTab('chat'); };

  const capture = (c: Capture) => {
    openChat();
    if (c.title) { chat.send(state, c.title); return; }
    if (c.note) chat.aside(c.note, 'I can’t read photos or voice notes yet. What should I plan from it — a deadline, or a commitment?');
  };
  const onChatChip = (chip: ChatChip) => {
    if (chip.action === 'calendar') {
      // Re-plan against the week as it is now, so an old offer can never apply stale changes.
      if (chat.offer) openOutcome(planRequest(state, chat.offer.request));
      else setTab('calendar');
      return;
    }
    if (chip.action === 'edit') { const task = chat.draft.proposal?.task; if (task) setOverlay({ type: 'editor', task, fromChat: true }); return; }
    if (chip.send) chat.send(state, chip.send);
  };

  /** Replanning started from the app itself (Find room, an edited roadmap, a progress update). */
  const beginTaskPlan = (draft?: Task) => {
    const known = !!draft && state.tasks.some(t => t.id === draft.id);
    const outcome = !draft ? replan(state, state.tasks)
      : known ? replan(state, state.tasks.map(t => (t.id === draft.id ? draft : t)))
      : planRequest(state, { task: draft });
    setOverlay(null);
    present(outcome, 'app');
  };
  useEffect(() => { if (overlay?.type === 'compare') beginTaskPlan(overlay.draft); }, [overlay]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overlay) { close(); return true; }
      if (tab === 'chat' && flow) { setFlow(flow.step === 'compare' ? { ...flow, step: 'fit' } : null); return true; }
      if (tab === 'chat') { leaveChat(); return true; }
      if (compare || pending) { discard(); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [tab, overlay, pending, compare, origin, flow, previewFrom]);

  const scrollToFocus = () => {
    if (!focus || focus.date !== day) return;
    const rows = [...state.commitments, ...state.blocks, ...(shownPlan?.commitments || []), ...(shownPlan?.blocks || [])].filter(b => b.date === day);
    const from = Math.min(480, ...rows.map(b => Math.floor(b.start / 60) * 60));
    // In month view the pinned week row covers the top ~56px, so aim a little lower.
    calendarScroll.current?.scrollTo({ y: Math.max(0, timelineTop.current + focus.start - from - 20 - (view === 'month' ? 56 : 0)), animated: !motionOff });
  };
  // Changing view starts at the top; an old "scroll to this item" is not replayed.
  // (Declared first, so a jump that also sets the view still lands on its item.)
  useEffect(() => { calendarScroll.current?.scrollTo({ y: 0, animated: false }); }, [view]);
  useEffect(scrollToFocus, [focus?.nonce, day, motionOff]);
  const weekLabel = `${dateLabel(WEEK[0])} – ${dateLabel(WEEK[6])}`;

  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}><ActivityIndicator color={C.green} /><Txt>Opening your week…</Txt></View>;

  return <MotionContext.Provider value={motionOff}><View style={{ flex: 1, backgroundColor: C.paper }}><SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: C.paper }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />

    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 16 }}>
      <View style={S.between}>
        <View style={{ flex: 1 }}><Txt accessibilityRole="header" style={{ fontSize: 32, lineHeight: 39, fontWeight: '800', letterSpacing: -1.3, color: C.green }}>LoadTree</Txt><Txt muted style={{ fontSize: 12, lineHeight: 18 }}>{state.setupDone ? `${state.preferences.name || 'Your'}’s week, with breathing room` : 'Make room for what matters'}</Txt></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => setOverlay({ type: 'settings' })} style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, ...SOFT_SHADOW }}>
          <Avatar size={42} />
        </Pressable>
      </View>
      {state.setupDone && tab !== 'chat' && <Segmented value={onCalendar ? 'calendar' : 'home'} onChange={v => { if (compare || pending) discard(); setTab(v); }} options={[{ id: 'home', label: 'Tree' }, { id: 'calendar', label: 'Calendar' }]} />}
    </View>

    {!state.setupDone ? <Page>
      <View style={{ gap: 10 }}><Chip>Your week, with breathing room</Chip><Title>A little space to grow.</Title><Txt muted>See what you’re carrying, then make a plan that leaves room for you.</Txt></View>
      <TreeScene loads={loads} selected={dimension} onSelect={setDimension} height={360} />
      <View style={{ gap: 10 }}>
        <Button icon="leaf" onPress={() => { dispatch({ type: 'reset' }); setToast('Alex’s week is ready. Tap the box below to plan something.'); }}>Try Alex’s sample week</Button>
        <Button kind="quiet" onPress={() => { dispatch({ type: 'reset', empty: true }); setOverlay({ type: 'setup' }); }}>Set up my own week</Button>
      </View>
    </Page> : <View style={{ flex: 1, paddingBottom: keyboard }}>

      {tab === 'chat' && !flow && <ChatScreen chat={chat} now={state.now} onChip={onChatChip} onClose={leaveChat}
        onEditTask={task => setOverlay({ type: 'editor', task, fromChat: true })}
        onEditEvent={commitment => setOverlay({ type: 'chatEvent', commitment })}
        onContinue={async () => { const outcome = await chat.send(state, 'Looks right', 'Looks good, continue'); if (outcome) openOutcome(outcome); }} />}
      {tab === 'chat' && flow?.step === 'fit' && <FitScreen state={state} outcome={flow.outcome} onBack={() => setFlow(null)} onCompare={() => setFlow({ ...flow, step: 'compare' })} onEdit={editItems} />}
      {tab === 'chat' && flow?.step === 'compare' && <CompareScreen state={state} outcome={flow.outcome} options={flow.options} index={flow.index}
        onIndex={i => setFlow(f => f && { ...f, index: i })} onBack={() => setFlow({ ...flow, step: 'fit' })} onPreview={previewChoice} onEdit={editItems} />}

      {/* Home is the tree and nothing else; tasks live in the calendar and the chat. */}
      {tab === 'home' && <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 12 }}>
        <HeroScene loads={loads} selected={dimension} onSelect={d => { setDimension(d); setOverlay({ type: 'dimension', dim: d }); }} greeting={`Hello, ${state.preferences.name || 'there'}`} week={weekLabel} />
        <LoadSummary loads={loads} onOpen={d => { setDimension(d); setOverlay({ type: 'dimension', dim: d }); }} />
      </View>}

      {onCalendar && <View style={{ flex: 1 }}>
        {/* A compact header so the schedule starts high on the screen. */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6, gap: 8, zIndex: 5 }}>
          <View style={[S.between, { gap: 8 }]}>
            <Txt accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4 }}>{longDate(day, !compare && day !== state.now.slice(0, 10))}</Txt>
            {/* Any day other than today gets a quick way back. */}
            {!compare && day !== state.now.slice(0, 10) && <Pressable accessibilityRole="button" accessibilityLabel="Go to today" onPress={() => setDay(state.now.slice(0, 10))}
              style={{ minHeight: 36, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.line }}>
              <Txt style={{ fontSize: 13, fontWeight: '700', color: C.green }}>Today</Txt>
            </Pressable>}
            {!compare && <Pressable accessibilityRole="button" accessibilityState={{ expanded: viewMenu }} accessibilityLabel={`${VIEW_LABEL[view]} view. Change view`} onPress={() => setViewMenu(!viewMenu)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.sage }}>
              <Txt style={{ fontSize: 14, fontWeight: '700', color: C.green }}>{VIEW_LABEL[view]}</Txt>
              <View style={{ transform: [{ rotate: viewMenu ? '-90deg' : '90deg' }] }}><Icon name="forward" size={14} /></View>
            </Pressable>}
            {/* Weekly setup sits with the calendar it shapes. */}
            {!compare && <Pressable accessibilityRole="button" accessibilityLabel="Weekly setup" onPress={() => setOverlay({ type: 'setup' })}
              style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.sage }}>
              <Icon name="settings" size={19} />
            </Pressable>}
          </View>
          {viewMenu && <View style={{ position: 'absolute', right: 64, top: 46, zIndex: 20, minWidth: 150, paddingVertical: 6, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, ...SOFT_SHADOW }}>
            {(['day', 'week', 'month'] as const).map(v => <Pressable key={v} accessibilityRole="menuitem" accessibilityState={{ selected: v === view }} onPress={() => { setView(v); setViewMenu(false); setFocus(null); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? C.surface : 'transparent' })}>
              <Txt style={{ fontSize: 15, fontWeight: v === view ? '800' : '500' }}>{VIEW_LABEL[v]}</Txt>
              {v === view && <Icon name="check" size={16} />}
            </Pressable>)}
          </View>}

          {/* This day's load, tied back to the tree. Tapping it explains where the time goes. */}
          {view !== 'week' && (() => {
            const load = dayLoad(state, day, shownPlan);
            const calm = load.tone === 'calm';
            return <Pressable accessibilityRole="button" accessibilityLabel={`Load ${load.score} percent, ${dayStatus(load)}. Show what feeds it`} onPress={() => setOverlay({ type: 'dimension', dim: 'time' })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
              <Txt muted style={{ fontSize: 13.5 }}>Load</Txt>
              <View style={{ width: 96, height: 8, borderRadius: 4, backgroundColor: C.track }}>
                <View style={{ width: `${Math.max(3, load.score)}%`, height: 8, borderRadius: 4, backgroundColor: TONE[load.tone] }} />
              </View>
              <Txt style={{ fontSize: 13.5, fontWeight: '700' }}>{load.score}%</Txt>
              <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9, backgroundColor: calm ? C.sage : C.amberBg }}>
                <Txt style={{ fontSize: 12.5, fontWeight: '700', color: calm ? C.green : C.amber }}>{dayStatus(load)}</Txt>
              </View>
            </Pressable>;
          })()}

          {!compare && view === 'day' && <WeekStrip state={shownPlan ? { ...state, tasks: shownPlan.tasks } : state} selected={day} onSelect={setDay} changes={shownPlan ? changes : blankChanges} />}
        </View>

        {stale && <Notice tone="amber">Your week changed, so this proposal no longer fits. Review the options again.</Notice>}
        {view === 'week'
          ? <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} style={{ flex: 1 }}>
              <WeekAgenda state={state} selected={day} plan={shownPlan} onDay={d => { setDay(d); setView('day'); }}
                onWeek={dir => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + dir * 7); setDay(d.toISOString().slice(0, 10)); }} />
            </ScrollView>
          : (() => {
            // Month view scrolls with the schedule instead of taking a fixed half of the screen;
            // the selected day's week row stays pinned at the top once the rest scrolls away.
            const month = view === 'month' && !compare;
            const weeks = month ? monthWeeks(day) : [];
            const pinned = weeks.findIndex(w => w.includes(day));
            const calState = shownPlan ? { ...state, tasks: shownPlan.tasks } : state;
            const nodes = [
              ...(month ? [
                <MonthHeader key="month-head" selected={day} onSelect={setDay} />,
                ...weeks.map(w => <MonthWeek key={w[0]} state={calState} week={w} selected={day} onSelect={setDay} changes={shownPlan ? changes : blankChanges} />),
              ] : []),
              <View key="timeline" onLayout={e => { timelineTop.current = e.nativeEvent.layout.y; }} style={{ paddingTop: month ? 14 : 0, gap: 16 }}>
                <DayTimeline state={state} date={day} plan={shownPlan} reduceMotion={motionOff} focus={focus} onJump={b => jump(b.date, b.start, b.id)} onTask={id => setOverlay({ type: 'detail', id })} onSlot={!shownPlan ? minutes => setOverlay({ type: 'newEvent', start: minutes }) : undefined} onEvent={!shownPlan ? id => setOverlay({ type: 'editEvent', id }) : undefined} />
                {needsPlan && !pending && <Button onPress={() => setOverlay({ type: 'compare' })}>Review a new plan</Button>}
              </View>,
            ];
            return <ScrollView ref={calendarScroll} onContentSizeChange={scrollToFocus} keyboardShouldPersistTaps="handled" stickyHeaderIndices={month && pinned >= 0 ? [pinned + 1] : undefined}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 }} style={{ flex: 1 }}>{nodes}</ScrollView>;
          })()}
      </View>}

      {burst > 0 && <View pointerEvents="none" style={{ position: 'absolute', left: '50%', bottom: 120 }}><LeafBurst key={burst} reduceMotion={motionOff} /></View>}
      {toast !== '' && <View accessibilityLiveRegion="polite" style={[S.row, { marginHorizontal: 20, marginBottom: 8, paddingTop: 10, borderTopWidth: 1, borderColor: C.line }]}>
        <Icon name="check" size={16} color={C.moss} />
        <Txt style={{ flex: 1, fontSize: 13 }}>{toast}</Txt>
        {state.undo && <Pressable accessibilityRole="button" accessibilityLabel="Undo last change" onPress={undo} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: C.sage }}><Txt style={{ fontSize: 13, fontWeight: '700', color: C.green }}>Undo</Txt></Pressable>}
      </View>}

      {onCalendar && pending && !compare && (() => {
        // Preview mode, unmistakable: which plan this is, what it does to the week, then Cancel or Apply.
        const fromFlow = previewFrom === 'compare' && flow ? flow : null;
        const fresh = pending.tasks.find(t => !state.tasks.some(o => o.id === t.id));
        const name = fromFlow ? describe(state, pending, fromFlow.outcome.request).title : fresh && pending.id.startsWith('fits') ? fresh.title : pending.title;
        const impact = impactOf(state, pending, fromFlow?.outcome.conflict, fromFlow?.outcome.request);
        const keeping = pending.id === 'keep';
        // Counted the way the plan card lists them, not block by block.
        const count = changesOf(state, pending, fromFlow?.outcome.request ?? { task: fresh }).length;
        // Workload: does the busiest day ahead get lighter or heavier with this plan?
        const upcoming = WEEK.filter(d => d >= state.now.slice(0, 10));
        const peak = (plan?: Candidate) => Math.max(0, ...upcoming.map(d => dayLoad(state, d, plan).score));
        const [before, after] = [peak(), peak(pending)];
        const metrics = [
          { label: 'Deadline', value: impact[0].value, good: impact[0].good },
          { label: 'Sleep', value: impact[1].value, good: impact[1].good },
          { label: 'Buffer', value: impact[3].value, good: impact[3].good },
          { label: 'Workload', value: after < before ? 'More balanced' : after > before ? 'Heavier' : 'Same', good: after <= before },
        ];
        const letter = fromFlow ? String.fromCharCode(65 + fromFlow.index) : null;
        return <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12, backgroundColor: C.white, borderWidth: 1, borderBottomWidth: 0, borderColor: C.line, ...SOFT_SHADOW }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: stale ? C.amberBg : C.sage, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calendar" size={22} color={stale ? C.amber : C.green} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt style={{ fontSize: 11.5, lineHeight: 15, fontWeight: '800', letterSpacing: 0.8, color: stale ? C.red : C.amber }}>{stale ? 'OUT OF DATE' : letter ? `PREVIEWING PLAN ${letter}` : 'PREVIEW'}</Txt>
              <Txt numberOfLines={1} style={{ fontSize: 16, lineHeight: 21, fontWeight: '800' }}>{stale ? 'Review the options again' : keeping ? 'No changes' : name}</Txt>
              <Txt numberOfLines={1} muted style={{ fontSize: 12.5 }}>{keeping ? 'Your week as it is now' : `${count} ${count === 1 ? 'change' : 'changes'} · nothing saved yet`}</Txt>
            </View>
            {/* Flip between plans right here on the calendar — the last one is the week unchanged. */}
            {fromFlow && fromFlow.options.length > 1 && <View style={{ flexDirection: 'row', gap: 6 }}>
              {fromFlow.options.map((o, i) => {
                const on = i === fromFlow.index;
                const l = String.fromCharCode(65 + i);
                return <Pressable key={o.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Preview plan ${l}`} onPress={() => { if (!on) previewChoice(i, true); }}
                  style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.green : pressed ? C.line : C.sage })}>
                  <Txt style={{ fontSize: 14, fontWeight: '800', color: on ? C.white : C.green }}>{l}</Txt>
                </Pressable>;
              })}
            </View>}
          </View>
          {!stale && <View style={{ flexDirection: 'row' }}>
            {metrics.map((item, i) => <View key={item.label} style={{ flex: 1, paddingHorizontal: 7, borderLeftWidth: i ? 1 : 0, borderColor: C.line }}>
              <Txt muted numberOfLines={1} style={{ fontSize: 12, lineHeight: 16 }}>{item.label}</Txt>
              <Txt numberOfLines={1} style={{ fontSize: 13.5, lineHeight: 19, fontWeight: '800', color: item.good ? C.green : C.amber }}>{item.value}</Txt>
            </View>)}
          </View>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* From the plan cards, this goes back to them; otherwise it simply cancels. */}
            <Pressable accessibilityRole="button" onPress={discard} style={({ pressed }) => ({ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.7 : 1 })}>
              <Txt style={{ fontSize: 15.5, fontWeight: '700' }}>{fromFlow ? 'Back to options' : 'Cancel'}</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: stale }} disabled={stale} onPress={approve} style={({ pressed }) => ({ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: C.green, opacity: stale ? 0.45 : pressed ? 0.85 : 1 })}>
              <Txt style={{ fontSize: 15.5, fontWeight: '700', color: C.white }}>{keeping ? 'Keep as it is' : fromFlow ? `Apply plan ${letter}` : 'Add to calendar'}</Txt>
            </Pressable>
          </View>
        </View>;
      })()}

      {onCalendar && compare && <OptionsPanel state={state} conflict={compare.conflict} subject={compare.subject} options={compare.options} index={optionIndex} day={day} height={panelHeight} reduceMotion={motionOff}
        onSelect={i => { setOptionIndex(i); setPending(compare.options[i]); focusPlan(compare.options[i]); }}
        onDay={date => focusPlan(compare.options[optionIndex], date)} onCancel={discard} onApply={() => { if (stale) { setToast('This option cannot fit. Choose another.'); return; } approve(); }} />}

      {!(onCalendar && (compare || pending)) && !(tab === 'chat' && flow) && <InputBar mode={tab === 'chat' ? 'full' : 'launcher'} focusKey={focusKey} hasHistory={chat.messages.length > 1} onOpen={focus => { openChat(); if (focus) setFocusKey(k => k + 1); /* the keyboard opens only when the text area was tapped */ }} onCapture={capture} onNotice={setToast} />}
    </View>}

    {overlay?.type === 'dimension' && <LoadDetail state={state} dim={overlay.dim} onClose={close}
      onTask={id => setOverlay({ type: 'detail', id })}
      // A day or a commitment opens the calendar right there; the sheets close so it can be seen.
      onDay={(date, start) => { setOverlay(null); jump(date, start ?? 480); }} />}
    {overlay?.type === 'newEvent' && <RoutineEditor heading="Add event" onClose={close}
      initial={{ name: '', start: overlay.start, end: Math.min(1440, overlay.start + 60), days: [day], kind: 'fixed', dimension: 'mental' }}
      onSave={r => {
        const add = commitmentsFor([], r);
        const next = reducer(state, { type: 'replaceCommitments', remove: [], add });
        if (next === state) { setToast('That overlaps something already there.'); return; }
        dispatch({ type: 'replaceCommitments', remove: [], add });
        close();
        setToast(`${r.name} added.`);
      }} />}
    {overlay?.type === 'editEvent' && (() => {
      const existing = state.commitments.find(c => c.id === overlay.id);
      if (!existing) return null;
      // Editing one occurrence edits the routine it belongs to, like a repeating event in other calendars.
      const group = groupCommitments(state.commitments).find(g => g.some(c => c.id === existing.id)) ?? [existing];
      const remove = group.map(c => c.id);
      return <RoutineEditor heading="Edit event" initial={routineOf(group)} onClose={close}
        onSave={r => {
          const add = commitmentsFor(group, r);
          if (reducer(state, { type: 'replaceCommitments', remove, add }) === state) { setToast('That overlaps something already there.'); return; }
          dispatch({ type: 'replaceCommitments', remove, add });
          close();
          setToast(`${r.name} updated.`);
        }}
        onDelete={() => { dispatch({ type: 'replaceCommitments', remove, add: [] }); close(); setToast(`${existing.title} deleted.`); }} />;
    })()}
    {overlay?.type === 'setup' && <Setup state={state} onClose={close} onSave={(preferences, commitments) => { dispatch({ type: 'setup', preferences, commitments }); close(); setToast('Weekly setup saved.'); }} />}
    {overlay?.type === 'editor' && <TaskEditor initial={overlay.task} seed={overlay.seed} onClose={close} onPlan={overlay.fromChat ? task => { chat.amend({ task }); close(); } : beginTaskPlan} />}
    {overlay?.type === 'chatEvent' && <RoutineEditor heading="Edit event" kinds={['fixed', 'flexible']} onClose={close}
      initial={{ name: overlay.commitment.title, start: overlay.commitment.start, end: overlay.commitment.end, days: [overlay.commitment.date], kind: overlay.commitment.kind, dimension: overlay.commitment.dimension }}
      onSave={r => {
        // A brain-dump item is one occurrence; the first chosen day is the one that counts.
        const [first] = commitmentsFor([overlay.commitment], { ...r, days: [WEEK.find(d => r.days.includes(d)) ?? overlay.commitment.date] });
        chat.amend({ commitment: first });
        close();
      }} />}
    {overlay?.type === 'noFit' && <Sheet title="No complete plan fits" onClose={close}>
      <Notice tone="amber">{duration(overlay.shortfall)} still needs focus time.</Notice>
      {overlay.task && <Button onPress={() => setOverlay({ type: 'editor', task: overlay.task })}>Edit task</Button>}
      <Button kind="outline" onPress={() => setOverlay({ type: 'setup' })}>Edit focus time</Button>
    </Sheet>}
    {overlay?.type === 'progress' && detailTask && <Progress task={detailTask} stepId={overlay.stepId} onClose={() => setOverlay({ type: 'detail', id: detailTask.id })} onSave={minutes => { dispatch({ type: 'progress', taskId: detailTask.id, stepId: overlay.stepId, remaining: minutes }); if (minutes === 0) setBurst(b => b + 1); setToast(minutes === 0 ? 'Step completed.' : 'Progress saved. Checking your remaining work.'); setOverlay(minutes === 0 ? { type: 'detail', id: detailTask.id } : { type: 'compare' }); }} />}
    {overlay?.type === 'detail' && detailTask && <Sheet title={detailTask.title} subtitle={`Due ${dateLabel(detailTask.deadline)} at ${detailTask.deadline.split('T')[1]}`} onClose={close} footer={<Button kind="outline" onPress={() => setOverlay({ type: 'editor', task: detailTask })}>Edit roadmap</Button>}>
      <Chip icon={remaining(detailTask) ? 'clock' : 'check'}>{remaining(detailTask) ? `${duration(remaining(detailTask))} left` : 'All steps complete'}</Chip>
      {/* The same breakdown the calendar blocks show, counted: which steps already have time. */}
      <Txt muted>{detailTask.steps.filter(s => s.remaining === 0 || state.blocks.filter(b => b.taskId === detailTask.id && b.stepId === s.id && stamp(b) >= state.now).reduce((sum, b) => sum + b.end - b.start, 0) >= s.remaining).length} of {detailTask.steps.length} steps scheduled</Txt>
      {!remaining(detailTask) && <Notice>You followed it through. Your protected downtime is still yours.</Notice>}
      <TaskSpine task={detailTask} blocks={state.blocks} now={state.now} onJump={block => { close(); jump(block.date, block.start, block.id); }} onProgress={stepId => setOverlay({ type: 'progress', id: detailTask.id, stepId })} />
      {remaining(detailTask) > 0 && <Button onPress={() => setOverlay({ type: 'compare' })}>Review remaining plan</Button>}
      <Button kind="danger" onPress={() => setOverlay({ type: 'delete', id: detailTask.id })}>Delete task</Button>
    </Sheet>}
    {overlay?.type === 'settings' && <Sheet title="Settings" onClose={close}>
      <Group>
        <Row label="Weekly setup" sub="Focus time, limits, events" onPress={() => setOverlay({ type: 'setup' })} />
        <Row label="Reduce motion" right={<Toggle label="Reduce motion" value={motionOff} onChange={v => { if (!systemReduceMotion) setLocalReduceMotion(v); }} />} />
      </Group>
      <Group>
        <Row label="Undo last change" disabled={!state.undo} onPress={() => { undo(); close(); }} />
        <Row label="Skip to Wednesday" sub="Demo" disabled={state.now >= '2026-09-09T08:00' || !state.blocks.length} onPress={() => setOverlay({ type: 'advance' })} />
      </Group>
      <Group><Row label="Reset sample week" danger onPress={() => setOverlay({ type: 'reset' })} /></Group>
      {storageError && <Txt style={{ color: C.amber, fontSize: 13 }}>Couldn’t save on this device.</Txt>}
    </Sheet>}
    {overlay?.type === 'advance' && <Sheet title="Skip to Wednesday?" onClose={close} footer={<Button onPress={() => { dispatch({ type: 'advance' }); setDay(WEEK[2]); setTab('home'); setOverlay(null); setToast('It’s Wednesday.'); }}>Skip to Wednesday</Button>}>
      <Txt muted>Work before Wednesday is marked done.</Txt>
    </Sheet>}
    {overlay?.type === 'reset' && <Sheet title="Reset sample week?" onClose={close} footer={<Button kind="danger" onPress={() => { dispatch({ type: 'reset' }); chat.clear(); setCompare(null); setPending(null); setFlow(null); setTab('home'); setDay(WEEK[0]); setDimension(undefined); setCompletedFilter(false); setOverlay(null); setToast('Sample week restored.'); }}>Reset</Button>}>
      <Txt muted>Your tasks, progress and chat will be replaced.</Txt>
    </Sheet>}
    {overlay?.type === 'delete' && detailTask && <Sheet title="Delete this task?" onClose={close} footer={<Button kind="danger" onPress={() => { dispatch({ type: 'delete', taskId: detailTask.id }); setOverlay(null); setToast('Task deleted.'); }}>Delete</Button>}>
      <Txt muted>{detailTask.title} and its focus blocks will be removed.</Txt>
    </Sheet>}
  </SafeAreaView></View></MotionContext.Provider>;
}

export default function LoadTreeApp() {
  return <SafeAreaProvider><LoadTreeProvider><Application /></LoadTreeProvider></SafeAreaProvider>;
}
