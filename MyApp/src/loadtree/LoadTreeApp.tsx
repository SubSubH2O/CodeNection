import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, LayoutAnimation, Platform, Pressable, ScrollView, Switch, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LoadTreeProvider, useLoadTree } from './store';
import { reducer } from './state';
import { Candidate, Dimension, Task, WEEK, dateLabel, duration, remaining } from './model';
import { Avatar, C, Button, Chip, Group, Icon, MotionContext, Notice, Page, Row, S, Segmented, Sheet, SOFT_SHADOW, Title, Toggle, Txt } from './ui';
import { dimensionLoad, loadScores, summarise } from './load';
import { HeroScene } from './HeroScene';
import { TreeScene } from './TreeScene';
import { LeafBurst } from './Pixel';
import { Capture, InputBar, useKeyboardInset } from './InputBar';
import { Conflict } from './conflict';
import { OptionsPanel } from './OptionsPanel';
import { TaskSpine } from './TaskSpine';
import { RoutineEditor, commitmentsFor, groupCommitments, routineOf } from './RoutineEditor';
import { TimeBlocks } from './TimeBlocks';
import { WeeklyEventsSheet } from './WeeklyEvents';
import { DayTimeline, MonthGrid, WeekStrip, changesOn, planChanges } from './Calendar';
import { Progress, TaskEditor } from './TaskFlow';
import { futureCoverage, validatePlan } from './planner';
import { ChatScreen, useChat } from './ChatScreen';
import { Chip as ChatChip } from './chat';
import { Outcome, appliedSummary, planRequest, replan } from './flow';

type Tab = 'home' | 'calendar' | 'chat';
type Overlay =
  | { type: 'setup' | 'settings' | 'reset' | 'advance' | 'weeklyEvents' }
  | { type: 'editor'; task?: Task; seed?: Task; fromChat?: boolean }
  | { type: 'compare'; draft?: Task }
  | { type: 'dimension'; dim: Dimension }
  | { type: 'detail'; id: string }
  | { type: 'progress'; id: string; stepId: string }
  | { type: 'delete'; id: string }
  | { type: 'newEvent'; start: number }
  | { type: 'editEvent'; id: string }
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
  const [reduceMotion, setReduceMotion] = useState(false);
  const [completedFilter, setCompletedFilter] = useState(false);
  const [pending, setPending] = useState<Candidate | null>(null);
  const [previewing, setPreviewing] = useState(true);
  const [monthOpen, setMonthOpen] = useState(false);
  const [compare, setCompare] = useState<{ conflict?: Conflict; subject?: string; options: Candidate[] } | null>(null);
  const [optionIndex, setOptionIndex] = useState(0);
  // Where the proposal on screen came from, so the chat can record what happened to it.
  const [origin, setOrigin] = useState<'chat' | 'app'>('app');
  const sequence = useRef(0);
  const lastTab = useRef<Tab>('home');
  const [focus, setFocus] = useState<{ date: string; start: number; blockId?: string; nonce: number } | null>(null);
  const calendarScroll = useRef<ScrollView>(null);
  const [localReduceMotion, setLocalReduceMotion] = useState(false);
  const systemReduceMotion = reduceMotion;
  const motionOff = systemReduceMotion || localReduceMotion;
  const { height: screenHeight } = useWindowDimensions();
  // Rows that do not differ are hidden, so the panel can stay short and leave the calendar visible.
  const panelHeight = Math.min(340, Math.max(280, screenHeight * 0.4));
  const keyboard = useKeyboardInset();
  const chat = useChat();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 6000); return () => clearTimeout(timeout); }, [toast]);

  // First time launch: prompt the user for time blocks once
  useEffect(() => {
    if (ready && !state.setupDone && stack.length === 0) {
      setOverlay({ type: 'setup' });
    }
  }, [ready, state.setupDone]);

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
  const stale = !!pending && (pending.sourceRevision !== state.revision || validatePlan(state, pending.tasks, pending.commitments, pending.blocks).length > 0);
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
    if (origin === 'chat') { chat.note(summary); chat.clearOffer(); }
    setToast(summary);
    setBurst(b => b + 1);
  };

  const jump = (date: string, start: number, blockId?: string) => { setDay(date); setTab('calendar'); setMonthOpen(false); setFocus({ date, start, blockId, nonce: ++sequence.current }); };
  const focusPlan = (option: Candidate, date?: string) => {
    const shift = planChanges(state, option);
    const target = date || shift.moved[0]?.before.date || shift.removed[0]?.date || shift.added[0]?.date || day;
    const rows = [...shift.added, ...shift.removed, ...shift.moved.map(m => m.now), ...shift.moved.map(m => m.before)].filter(b => b.date === target).sort((a, b) => a.start - b.start);
    jump(target, rows[0]?.start ?? option.blocks.find(b => b.date === target)?.start ?? 1080);
  };
  const showOptions = (options: Candidate[], conflict?: Conflict, subject?: string) => {
    if (!options.length) return;
    setCompare({ options, conflict, subject }); setOptionIndex(0); setPending(options[0]); setPreviewing(true); focusPlan(options[0]);
  };

  /** Puts a planning outcome on the calendar: one proposal if it fits, a comparison if it does not. */
  const present = (outcome: Outcome, from: 'chat' | 'app') => {
    setOrigin(from);
    const subject = outcome.request.commitment?.title ?? outcome.request.task?.title;
    if (outcome.kind === 'fits' && outcome.options.length > 1) { showOptions(outcome.options, undefined, subject); return; }
    if (outcome.kind === 'fits') { setCompare(null); setPending(outcome.plan); setPreviewing(true); focusPlan(outcome.plan); return; }
    if (outcome.kind === 'options') { showOptions(outcome.options, outcome.conflict, subject); return; }
    if (outcome.kind === 'none') setOverlay({ type: 'noFit', task: outcome.request.task, shortfall: outcome.shortfall });
  };
  const capture = (c: Capture) => {
    openChat();
    if (c.title) { chat.send(state, c.title); return; }
    if (c.note) chat.aside(c.note, 'I can’t read photos or voice notes yet. What should I plan from it — a deadline, or a commitment?');
  };
  const onChatChip = (chip: ChatChip) => {
    if (chip.action === 'calendar') {
      // Re-plan against the week as it is now, so an old offer can never apply stale changes.
      if (chat.offer) present(planRequest(state, chat.offer.request), 'chat');
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
      if (tab === 'chat') { leaveChat(); return true; }
      if (compare || pending) { discard(); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [tab, overlay, pending, compare, origin]);

  const scrollToFocus = () => {
    if (!focus || focus.date !== day) return;
    const rows = [...state.commitments, ...state.blocks, ...(shownPlan?.commitments || []), ...(shownPlan?.blocks || [])].filter(b => b.date === day);
    const from = Math.min(480, ...rows.map(b => Math.floor(b.start / 60) * 60));
    calendarScroll.current?.scrollTo({ y: Math.max(0, focus.start - from - 20), animated: !motionOff });
  };
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
      <View style={{ gap: 10 }}>
        <Chip>Welcome to LoadTree</Chip>
        <Title>Set up your time blocks</Title>
        <Txt muted>Configure your Study, Free, and Sleep time blocks once. LoadTree protects your free time and reschedules your study cleanly.</Txt>
      </View>
      <TreeScene loads={loads} selected={dimension} onSelect={setDimension} height={360} />
      <View style={{ gap: 10 }}>
        <Button icon="calendar" onPress={() => setOverlay({ type: 'setup' })}>Configure my time blocks</Button>
        <Button kind="quiet" onPress={() => { dispatch({ type: 'reset' }); setToast('Alex’s sample week loaded.'); }}>Or explore sample student week</Button>
      </View>
    </Page> : <View style={{ flex: 1, paddingBottom: keyboard }}>

      {tab === 'chat' && <ChatScreen chat={chat} onChip={onChatChip} onClose={leaveChat} />}

      {/* Home is the tree and nothing else; tasks live in the calendar and the chat. */}
      {tab === 'home' && <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 }}>
        <HeroScene loads={loads} selected={dimension} onSelect={d => { setDimension(d); setOverlay({ type: 'dimension', dim: d }); }} greeting={`Hello, ${state.preferences.name || 'there'}`} week={weekLabel} />
      </View>}

      {onCalendar && <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
          <View style={[S.between, { flexWrap: 'wrap' }]}>
            <View style={{ flex: 1, minWidth: 150 }}>
              <Txt accessibilityRole="header" numberOfLines={1} style={{ fontSize: 20, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4, color: C.green }}>{dateLabel(day, true)}</Txt>
              <Txt muted style={{ fontSize: 13 }}>{shownPlan && changesOn(changes, day) > 0 ? `${changesOn(changes, day)} ${changesOn(changes, day) === 1 ? 'change' : 'changes'} here` : new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Txt>
            </View>
            {/* Events this week sits beside weekly setup */}
            {!compare && <Pressable accessibilityRole="button" accessibilityLabel="Events this week" onPress={() => setOverlay({ type: 'weeklyEvents' })}
              style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.sage }}>
              <Icon name="calendar" size={19} />
            </Pressable>}
            {/* Time Blocks sits with the calendar it shapes: an icon beside the view switch. */}
            {!compare && <Pressable accessibilityRole="button" accessibilityLabel="Time Blocks" onPress={() => setOverlay({ type: 'setup' })}
              style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.sage }}>
              <Icon name="settings" size={19} />
            </Pressable>}
            {!compare && <Pressable accessibilityRole="button" accessibilityState={{ expanded: monthOpen }} accessibilityLabel={monthOpen ? 'Show one week' : 'Show the whole month'} onPress={() => setMonthOpen(!monthOpen)}
              style={{ minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 14, backgroundColor: C.sage }}>
              <Txt style={{ fontSize: 13, fontWeight: '700', color: C.green }}>{monthOpen ? 'Week' : 'Month'}</Txt>
            </Pressable>}
          </View>

          {!compare && (monthOpen
            ? <MonthGrid state={shownPlan ? { ...state, tasks: shownPlan.tasks } : state} selected={day} onSelect={setDay} changes={shownPlan ? changes : blankChanges} />
            : <WeekStrip state={shownPlan ? { ...state, tasks: shownPlan.tasks } : state} selected={day} onSelect={setDay} changes={shownPlan ? changes : blankChanges} />)}
        </View>

        {stale && <Notice tone="amber">Your week changed, so this proposal no longer fits. Review the options again.</Notice>}
        <ScrollView ref={calendarScroll} onContentSizeChange={scrollToFocus} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 24 }} style={{ flex: 1 }}>
          <DayTimeline state={state} date={day} plan={shownPlan} reduceMotion={motionOff} focus={focus} onJump={b => jump(b.date, b.start, b.id)} onTask={id => setOverlay({ type: 'detail', id })} onSlot={!shownPlan ? minutes => setOverlay({ type: 'newEvent', start: minutes }) : undefined} onEvent={!shownPlan ? id => setOverlay({ type: 'editEvent', id }) : undefined} />
          {needsPlan && !pending && <Button onPress={() => setOverlay({ type: 'compare' })}>Review a new plan</Button>}
        </ScrollView>
      </View>}

      {burst > 0 && <View pointerEvents="none" style={{ position: 'absolute', left: '50%', bottom: 120 }}><LeafBurst key={burst} reduceMotion={motionOff} /></View>}
      {toast !== '' && <View accessibilityLiveRegion="polite" style={[S.row, { marginHorizontal: 20, marginBottom: 8, paddingTop: 10, borderTopWidth: 1, borderColor: C.line }]}>
        <Icon name="check" size={16} color={C.moss} />
        <Txt style={{ flex: 1, fontSize: 13 }}>{toast}</Txt>
        {state.undo && <Pressable accessibilityRole="button" accessibilityLabel="Undo last change" onPress={undo} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: C.sage }}><Txt style={{ fontSize: 13, fontWeight: '700', color: C.green }}>Undo</Txt></Pressable>}
      </View>}

      {onCalendar && pending && !compare && <View style={{ marginHorizontal: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10, backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: C.line, ...SOFT_SHADOW }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="calendar" size={24} color={stale ? C.amber : C.green} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '700' }}>{stale ? 'Proposal out of date' : pending.title}</Txt>
            <Txt numberOfLines={1} muted style={{ fontSize: 12 }}>{stale ? 'Review the options again.' : `${changes.total} ${changes.total === 1 ? 'change' : 'changes'} · nothing saved yet`}</Txt>
          </View>
          {!stale && <Segmented compact accent={C.flag} value={previewing ? 'preview' : 'current'} onChange={v => setPreviewing(v === 'preview')} options={[{ id: 'current', label: 'Now' }, { id: 'preview', label: 'Preview' }]} />}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={discard} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: C.line }}><Txt style={{ fontSize: 13.5, fontWeight: '600' }}>Cancel</Txt></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: stale }} disabled={stale} onPress={approve} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: C.green, opacity: stale ? 0.45 : 1 }}><Txt style={{ fontSize: 13.5, fontWeight: '700', color: C.white }}>{pending.id.startsWith('fits') ? 'Add to calendar' : 'Apply plan'}</Txt></Pressable>
        </View>
      </View>}

      {onCalendar && compare && <OptionsPanel state={state} conflict={compare.conflict} subject={compare.subject} options={compare.options} index={optionIndex} day={day} height={panelHeight} reduceMotion={motionOff}
        onSelect={i => { setOptionIndex(i); setPending(compare.options[i]); focusPlan(compare.options[i]); }}
        onDay={date => focusPlan(compare.options[optionIndex], date)} onCancel={discard} onApply={() => { if (stale) { setToast('This option cannot fit. Choose another.'); return; } approve(); }} />}

      {!(onCalendar && (compare || pending)) && <InputBar mode={tab === 'chat' ? 'full' : 'launcher'} autoFocus={tab === 'chat'} hasHistory={chat.messages.length > 1} onOpen={openChat} onCapture={capture} onNotice={setToast} />}
    </View>}

    {overlay?.type === 'dimension' && (() => {
      const load = dimensionLoad(state, overlay.dim);
      return <Sheet title={`${load.label} · ${load.score}/100`} subtitle={summarise(load)} onClose={close}>
        {load.contributors.map((c, i) => <View key={c.id} style={{ gap: 2, paddingTop: i ? 14 : 0, borderTopWidth: i ? 1 : 0, borderColor: C.line }}><Txt style={{ fontWeight: '600' }}>{c.title}</Txt><Txt muted style={{ fontSize: 13 }}>{c.detail}</Txt></View>)}
        {!load.contributors.length && <Txt muted>Nothing here this week.</Txt>}
      </Sheet>;
    })()}
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
    {overlay?.type === 'setup' && <TimeBlocks state={state} onClose={close} onSave={(preferences, commitments) => { dispatch({ type: 'setup', preferences, commitments }); close(); setToast('Time blocks saved.'); }} />}
    {overlay?.type === 'weeklyEvents' && <WeeklyEventsSheet commitments={state.commitments} onClose={close} onNewEvent={_d => setOverlay({ type: 'newEvent', start: 540 })} onEditEvent={id => setOverlay({ type: 'editEvent', id })} />}
    {overlay?.type === 'editor' && <TaskEditor initial={overlay.task} seed={overlay.seed} onClose={close} onPlan={overlay.fromChat ? task => { chat.revise(state, task); close(); } : beginTaskPlan} />}
    {overlay?.type === 'noFit' && <Sheet title="No complete plan fits" onClose={close}>
      <Notice tone="amber">{duration(overlay.shortfall)} still needs a study window.</Notice>
      {overlay.task && <Button onPress={() => setOverlay({ type: 'editor', task: overlay.task })}>Edit task</Button>}
      <Button kind="outline" onPress={() => setOverlay({ type: 'setup' })}>Edit time blocks</Button>
    </Sheet>}
    {overlay?.type === 'progress' && detailTask && <Progress task={detailTask} stepId={overlay.stepId} onClose={() => setOverlay({ type: 'detail', id: detailTask.id })} onSave={minutes => { dispatch({ type: 'progress', taskId: detailTask.id, stepId: overlay.stepId, remaining: minutes }); if (minutes === 0) setBurst(b => b + 1); setToast(minutes === 0 ? 'Step completed.' : 'Progress saved. Checking your remaining work.'); setOverlay(minutes === 0 ? { type: 'detail', id: detailTask.id } : { type: 'compare' }); }} />}
    {overlay?.type === 'detail' && detailTask && <Sheet title={detailTask.title} subtitle={`Due ${dateLabel(detailTask.deadline)} at ${detailTask.deadline.split('T')[1]}`} onClose={close} footer={<Button kind="outline" onPress={() => setOverlay({ type: 'editor', task: detailTask })}>Edit roadmap</Button>}>
      <Chip icon={remaining(detailTask) ? 'clock' : 'check'}>{remaining(detailTask) ? `${duration(remaining(detailTask))} left` : 'All steps complete'}</Chip>
      {!remaining(detailTask) && <Notice>You followed it through. Your protected downtime is still yours.</Notice>}
      <TaskSpine task={detailTask} blocks={state.blocks} now={state.now} onJump={block => { close(); jump(block.date, block.start, block.id); }} onProgress={stepId => setOverlay({ type: 'progress', id: detailTask.id, stepId })} />
      {remaining(detailTask) > 0 && <Button onPress={() => setOverlay({ type: 'compare' })}>Review remaining plan</Button>}
      <Button kind="danger" onPress={() => setOverlay({ type: 'delete', id: detailTask.id })}>Delete task</Button>
    </Sheet>}
    {overlay?.type === 'settings' && <Sheet title="Settings" onClose={close}>
      <Group>
        <Row label="Time Blocks" sub="Study, free time, and sleep blueprint" onPress={() => setOverlay({ type: 'setup' })} />
        <Row label="Events this week" sub="Classes, shifts, meetings" onPress={() => setOverlay({ type: 'weeklyEvents' })} />
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
    {overlay?.type === 'reset' && <Sheet title="Reset sample week?" onClose={close} footer={<Button kind="danger" onPress={() => { dispatch({ type: 'reset' }); chat.clear(); setCompare(null); setPending(null); setTab('home'); setDay(WEEK[0]); setDimension(undefined); setCompletedFilter(false); setOverlay(null); setToast('Sample week restored.'); }}>Reset</Button>}>
      <Txt muted>Your tasks, progress and chat will be replaced.</Txt>
    </Sheet>}
    {overlay?.type === 'delete' && detailTask && <Sheet title="Delete this task?" onClose={close} footer={<Button kind="danger" onPress={() => { dispatch({ type: 'delete', taskId: detailTask.id }); setOverlay(null); setToast('Task deleted.'); }}>Delete</Button>}>
      <Txt muted>{detailTask.title} and its study blocks will be removed.</Txt>
    </Sheet>}
  </SafeAreaView></View></MotionContext.Provider>;
}

export default function LoadTreeApp() {
  return <SafeAreaProvider><LoadTreeProvider><Application /></LoadTreeProvider></SafeAreaProvider>;
}
