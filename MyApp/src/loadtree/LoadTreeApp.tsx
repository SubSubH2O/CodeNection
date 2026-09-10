import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, LayoutAnimation, Platform, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LoadTreeProvider, useLoadTree } from './store';
import { Candidate, Commitment, Dimension, Task, WEEK, dateLabel, duration, remaining, stamp, time } from './model';
import { seedTask } from './demo';
import { Avatar, C, Button, Chip, Glass, Icon, LIFT_SHADOW, Notice, Page, S, Segmented, Sheet, SOFT_SHADOW, Title, Txt } from './ui';
import { dimensionLoad, loadScores, summarise } from './load';
import { HeroScene } from './HeroScene';
import { TreeScene } from './TreeScene';
import { Capture, InputBar, useKeyboardInset } from './InputBar';
import { ChatScreen, useChat } from './ChatScreen';
import { Conflict, conflictOptions, findConflict, parseInput } from './conflict';
import { ConflictSheet } from './ConflictSheet';
import { CompareScreen } from './CompareScreen';
import { NewEventSheet } from './NewEventSheet';
import { Setup } from './Setup';
import { DayTimeline, MonthGrid, WeekStrip, changesOn, planChanges } from './Calendar';
import { Comparison, Progress, TaskEditor } from './TaskFlow';
import { futureCoverage, validatePlan } from './planner';

type Tab = 'home' | 'calendar' | 'chat' | 'compare';
type Overlay =
  | { type: 'setup' | 'settings' | 'reset' | 'advance' }
  | { type: 'editor'; task?: Task; seed?: Task }
  | { type: 'compare'; draft?: Task }
  | { type: 'dimension'; dim: Dimension }
  | { type: 'detail'; id: string }
  | { type: 'progress'; id: string; stepId: string }
  | { type: 'delete'; id: string }
  | { type: 'newEvent'; start: number }
  | { type: 'editEvent'; id: string }
  | { type: 'conflict'; conflict: Conflict }
  | null;

function Application() {
  const { state, dispatch, ready, storageError } = useLoadTree();
  const [tab, setTab] = useState<Tab>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [dimension, setDimension] = useState<Dimension | undefined>(undefined);
  const [day, setDay] = useState(WEEK[0]);
  const [toast, setToast] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [completedFilter, setCompletedFilter] = useState(false);
  const [pending, setPending] = useState<Candidate | null>(null);
  const [previewing, setPreviewing] = useState(true);
  const [monthOpen, setMonthOpen] = useState(false);
  const [compare, setCompare] = useState<{ conflict: Conflict; options: Candidate[] } | null>(null);
  const keyboard = useKeyboardInset();
  const chat = useChat();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overlay) { setOverlay(null); return true; }
      if (tab === 'compare') { setCompare(null); setTab('calendar'); return true; }
      if (tab === 'chat') { setTab('home'); return true; }
      if (pending) { setPending(null); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [tab, overlay, pending, compare]);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 6000); return () => clearTimeout(timeout); }, [toast]);

  const close = () => setOverlay(null);
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
  const shownPlan = previewing && !stale ? pending : null;
  const undo = () => { dispatch({ type: 'undo' }); setToast('Previous state restored.'); };
  const discard = () => { setPending(null); setPreviewing(true); setToast('Proposed changes discarded. Your calendar is unchanged.'); };
  const approve = () => {
    if (!pending || stale) return;
    if (!reduceMotion && Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    dispatch({ type: 'approve', plan: pending });
    setDay([...changes.days].sort()[0] || state.now.slice(0, 10));
    setPending(null);
    setToast('Plan approved. Your calendar and next step are ready.');
  };
  const startPlan = (c: Capture) => {
    const text = c.title || c.note || '';
    const parsed = parseInput(text, state);
    if (parsed.commitment) {
      setDay(parsed.commitment.date);
      setTab('calendar');
      setOverlay({ type: 'conflict', conflict: findConflict(state, parsed.commitment) });
      return;
    }
    setTab('chat');
    chat.send(state, text || 'I have something to plan');
  };
  const openCompare = (conflict: Conflict) => {
    setCompare({ conflict, options: conflictOptions(state, conflict) });
    close();
    setTab('compare');
  };
  const previewOption = (option: Candidate) => {
    if (option.id === 'keep') { setCompare(null); setTab('calendar'); setToast('Nothing changed. Your week is as it was.'); return; }
    setPending(option);
    setPreviewing(true);
    setDay([...planChanges(state, option).days].sort()[0] || state.now.slice(0, 10));
    setCompare(null);
    setTab('calendar');
  };
  const previewFromChat = (plan: Candidate) => {
    setPending(plan);
    setPreviewing(true);
    setDay([...planChanges(state, plan).days].sort()[0] || state.now.slice(0, 10));
    setTab('calendar');
  };
  const weekLabel = `${dateLabel(WEEK[0])} – ${dateLabel(WEEK[6])}`;

  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}><ActivityIndicator color={C.green} /><Txt>Opening your week…</Txt></View>;

  return <View style={{ flex: 1, backgroundColor: '#DBECE4' }}><SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: C.paper }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />

    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 16 }}>
      <View style={S.between}>
        <View style={{ flex: 1 }}><Txt accessibilityRole="header" style={{ fontSize: 32, lineHeight: 39, fontWeight: '800', letterSpacing: -1.3, color: C.green }}>LoadTree</Txt><Txt muted style={{ fontSize: 12, lineHeight: 18 }}>{state.setupDone ? `${state.preferences.name || 'Your'}’s week, with breathing room` : 'Make room for what matters'}</Txt></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => setOverlay({ type: 'settings' })} style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, ...SOFT_SHADOW }}>
          <Avatar size={42} />
        </Pressable>
      </View>
      {state.setupDone && tab !== 'chat' && tab !== 'compare' && <Segmented value={tab === 'calendar' ? 'calendar' : 'home'} onChange={setTab} options={[{ id: 'home', label: 'Tree' }, { id: 'calendar', label: 'Calendar' }]} />}
    </View>

    {!state.setupDone ? <Page>
      <View style={{ gap: 10 }}><Chip>Your week, with breathing room</Chip><Title>A little space to grow.</Title><Txt muted>See what you’re carrying, then make a plan that leaves room for you.</Txt></View>
      <TreeScene loads={loads} selected={dimension} onSelect={setDimension} />
      <View style={{ gap: 10 }}>
        <Button icon="leaf" onPress={() => { dispatch({ type: 'reset' }); setToast('Alex’s week is ready. Tap a branch, then add the report.'); }}>Try Alex’s sample week</Button>
        <Button kind="quiet" onPress={() => { dispatch({ type: 'reset', empty: true }); setOverlay({ type: 'setup' }); }}>Set up my own week</Button>
        <Txt muted style={{ fontSize: 12, textAlign: 'center' }}>Saved on this device · no account needed</Txt>
      </View>
    </Page> : <View style={{ flex: 1, paddingBottom: keyboard }}>

      {tab === 'compare' && compare && <CompareScreen conflict={compare.conflict} options={compare.options} onBack={() => { setCompare(null); setTab('calendar'); }} onPreview={previewOption} />}

      {tab === 'chat' && <ChatScreen state={state} chat={chat} onClose={() => setTab('home')} onPlan={plan => previewFromChat(plan)} />}

      {tab === 'home' && <Page>
        <HeroScene loads={loads} selected={dimension} onSelect={d => { setDimension(d); setOverlay({ type: 'dimension', dim: d }); }} greeting={`Hello, ${state.preferences.name || 'there'}`} week={weekLabel} />

        {needsPlan && <View style={[S.row, { padding: 14, borderRadius: 16, backgroundColor: C.amberBg }]}>
          <Icon name="clock" size={19} color={C.amber} />
          <Txt style={{ flex: 1, fontSize: 14, color: C.amber }}>{duration(totalRemaining)} left · {duration(coverage)} scheduled</Txt>
          <Pressable accessibilityRole="button" onPress={() => setOverlay({ type: 'compare' })} style={{ minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12, backgroundColor: C.white }}><Txt style={{ fontSize: 13, fontWeight: '700', color: C.amber }}>Find room</Txt></Pressable>
        </View>}


        {nextTask && nextStep && <Pressable accessibilityRole="button" accessibilityLabel={`Next step: ${nextStep.title}`} onPress={() => setOverlay(needsPlan ? { type: 'compare' } : { type: 'progress', id: nextTask.id, stepId: nextStep.id })} style={{ backgroundColor: C.green, padding: 20, borderRadius: 20, gap: 8 }}>
          <View style={S.between}><Txt style={{ color: '#D0E8DC', fontSize: 13, fontWeight: '600' }}>Your next small step</Txt><Icon name="arrow" color="#B9D2C1" size={19} /></View>
          <Txt style={{ color: C.white, fontSize: 20, lineHeight: 26, fontWeight: '700' }}>{nextStep.title}</Txt>
          <Txt style={{ color: '#B9D2C1', fontSize: 13 }}>{duration(nextStep.remaining)} · {nextTask.title}</Txt>
        </Pressable>}


        {state.tasks.length > 0 && <View style={{ gap: 10 }}>
          <View style={S.between}>
            <Txt accessibilityRole="header" style={{ fontSize: 24, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5, color: C.green }}>Your roadmaps</Txt>
            {completed.length > 0 && <Chip active={completedFilter} onPress={() => setCompletedFilter(!completedFilter)}>{completedFilter ? `Completed (${completed.length})` : `In progress (${active.length})`}</Chip>}
          </View>
          {(completedFilter ? completed : active).map(t => { const done = t.steps.filter(s2 => s2.remaining === 0).length; return <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`Open ${t.title}`} onPress={() => setOverlay({ type: 'detail', id: t.id })} style={S.card}>
            <View style={S.between}><Chip icon={remaining(t) ? 'clock' : 'check'}>{remaining(t) ? `${duration(remaining(t))} left` : 'Completed'}</Chip><Icon name="arrow" size={18} /></View>
            <Title small>{t.title}</Title>
            <Txt muted style={{ fontSize: 13 }}>Due {dateLabel(t.deadline)}, {t.deadline.split('T')[1]}</Txt>
            <View style={{ height: 5, backgroundColor: C.track, borderRadius: 3 }}><View style={{ width: `${done / t.steps.length * 100}%`, height: 5, borderRadius: 3, backgroundColor: C.moss }} /></View>
            <Txt muted style={{ fontSize: 12 }}>{done} of {t.steps.length} steps done</Txt>
          </Pressable>; })}
        </View>}

      </Page>}

      {tab === 'calendar' && <Page>
        <View style={[S.between, { flexWrap: 'wrap' }]}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Txt accessibilityRole="header" numberOfLines={1} style={{ fontSize: 20, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4, color: C.green }}>{dateLabel(day, true)}</Txt>
            <Txt muted style={{ fontSize: 13 }}>{shownPlan && changesOn(changes, day) > 0 ? `${changesOn(changes, day)} ${changesOn(changes, day) === 1 ? 'change' : 'changes'} here` : new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Txt>
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: monthOpen }} accessibilityLabel={monthOpen ? 'Show one week' : 'Show the whole month'} onPress={() => setMonthOpen(!monthOpen)}
            style={{ minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 14, backgroundColor: C.sage }}>
            <Txt style={{ fontSize: 13, fontWeight: '700', color: C.green }}>{monthOpen ? 'Week' : 'Month'}</Txt>
          </Pressable>
        </View>

        {monthOpen
          ? <MonthGrid state={shownPlan ? { ...state, tasks: shownPlan.tasks } : state} selected={day} onSelect={setDay} changes={shownPlan ? changes : blankChanges} />
          : <WeekStrip state={shownPlan ? { ...state, tasks: shownPlan.tasks } : state} selected={day} onSelect={setDay} changes={shownPlan ? changes : blankChanges} />}

        {stale && <Notice tone="amber">Your week changed, so this proposal no longer fits. Review the options again.</Notice>}
        <DayTimeline state={state} date={day} plan={shownPlan} onTask={id => setOverlay({ type: 'detail', id })} onSlot={minutes => setOverlay({ type: 'newEvent', start: minutes })} onEvent={id => setOverlay({ type: 'editEvent', id })} />
        <Txt muted style={{ fontSize: 12, textAlign: 'center' }}>Tap any empty time to add something yourself.</Txt>
        {needsPlan && !pending && <Button onPress={() => setOverlay({ type: 'compare' })}>Review a new plan</Button>}
        <Button kind="quiet" onPress={() => setOverlay({ type: 'setup' })}>Edit weekly setup</Button>
      </Page>}

      {toast !== '' && <View accessibilityLiveRegion="polite" style={{ marginHorizontal: 16, marginBottom: 8, padding: 13, borderRadius: 14, backgroundColor: C.tealBg, gap: 3 }}>
        <Txt style={{ fontSize: 13 }}>{toast}</Txt>
        {state.undo && <Pressable accessibilityRole="button" accessibilityLabel="Undo last change" onPress={undo} style={{ paddingVertical: 8 }}><Txt style={{ fontSize: 13, fontWeight: '700' }}>Undo</Txt></Pressable>}
      </View>}

      {pending && <View style={{ marginHorizontal: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10, backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: C.line, ...SOFT_SHADOW }}>
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
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: stale }} disabled={stale} onPress={approve} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: C.green, opacity: stale ? 0.45 : 1 }}><Txt style={{ fontSize: 13.5, fontWeight: '700', color: C.white }}>Apply plan</Txt></Pressable>
        </View>
      </View>}

      {tab !== 'compare' && <InputBar mode={tab === 'chat' ? 'full' : 'launcher'} hasHistory={chat.messages.length > 1} onOpen={() => setTab('chat')} onCapture={startPlan} onNotice={setToast} />}
    </View>}

    {overlay?.type === 'dimension' && (() => {
      const load = dimensionLoad(state, overlay.dim);
      return <Sheet title={`${load.label} · ${load.score}/100`} subtitle={summarise(load)} onClose={close}>
        {load.contributors.map(c => <View key={c.id} style={S.card}><Txt style={{ fontWeight: '600' }}>{c.title}</Txt><Txt muted style={{ fontSize: 13 }}>{c.detail}</Txt></View>)}
        {!load.contributors.length && <Txt muted>Nothing is scheduled in this area for the rest of the week.</Txt>}
        <Txt muted style={{ fontSize: 12 }}>A reference load for the week, from what you entered. Not a health measurement.</Txt>
      </Sheet>;
    })()}
    {overlay?.type === 'conflict' && <ConflictSheet conflict={overlay.conflict} onClose={close}
      onOptions={() => openCompare(overlay.conflict)}
      onAddAnyway={() => { dispatch({ type: 'addCommitment', commitment: overlay.conflict.commitment }); close(); setToast(`${overlay.conflict.commitment.title} added.`); }} />}
    {overlay?.type === 'newEvent' && <NewEventSheet date={day} start={overlay.start} onClose={close} onAdd={commitment => {
      dispatch({ type: 'addCommitment', commitment });
      close();
      setToast(`${commitment.title} added. Future study blocks cleared — review a new plan.`);
    }} />}
    {overlay?.type === 'editEvent' && (() => {
      const existing = state.commitments.find(c => c.id === overlay.id);
      if (!existing) return null;
      return <NewEventSheet date={existing.date} start={existing.start} existing={existing} onClose={close}
        onAdd={commitment => {
          // Replace in place: remove then re-add, so the overlap checks still run.
          dispatch({ type: 'removeCommitment', id: existing.id });
          dispatch({ type: 'addCommitment', commitment });
          close();
          setToast(`${commitment.title} updated.`);
        }}
        onDelete={id => { dispatch({ type: 'removeCommitment', id }); close(); setToast(`${existing.title} removed. You can undo this.`); }} />;
    })()}
    {overlay?.type === 'setup' && <Setup state={state} onClose={close} onSave={(preferences, commitments) => { dispatch({ type: 'setup', preferences, commitments }); close(); setToast('Weekly setup saved.'); }} />}
    {overlay?.type === 'editor' && <TaskEditor initial={overlay.task} seed={overlay.seed} onClose={close} onPlan={draft => setOverlay({ type: 'compare', draft })} />}
    {overlay?.type === 'compare' && <Comparison state={state} draft={overlay.draft} onClose={close} onEdit={task => setOverlay({ type: 'editor', task })} onKeep={task => { dispatch({ type: 'saveTask', task }); close(); setToast('Task saved without study blocks.'); }} onSetup={() => { if (overlay.draft) dispatch({ type: 'saveTask', task: overlay.draft }); setOverlay({ type: 'setup' }); }} onPreview={plan => { setPending(plan); setPreviewing(true); setDay([...planChanges(state, plan).days].sort()[0] || plan.commitments.find(c => c.id === plan.movedId)?.date || state.now.slice(0, 10)); setTab('calendar'); close(); }} />}
    {overlay?.type === 'progress' && detailTask && <Progress task={detailTask} stepId={overlay.stepId} onClose={() => setOverlay({ type: 'detail', id: detailTask.id })} onSave={minutes => { dispatch({ type: 'progress', taskId: detailTask.id, stepId: overlay.stepId, remaining: minutes }); setToast(minutes === 0 ? 'Step completed.' : 'Progress saved. Checking your remaining work.'); setOverlay(minutes === 0 ? { type: 'detail', id: detailTask.id } : { type: 'compare' }); }} />}
    {overlay?.type === 'detail' && detailTask && <Sheet title={detailTask.title} subtitle={`Due ${dateLabel(detailTask.deadline)} at ${detailTask.deadline.split('T')[1]}`} onClose={close} footer={<Button kind="outline" onPress={() => setOverlay({ type: 'editor', task: detailTask })}>Edit roadmap</Button>}>
      <Chip icon={remaining(detailTask) ? 'clock' : 'check'}>{remaining(detailTask) ? `${duration(remaining(detailTask))} left` : 'All steps complete'}</Chip>
      {!remaining(detailTask) && <Notice>You followed it through. Your protected downtime is still yours.</Notice>}
      {detailTask.steps.map((step, i) => <View key={step.id} style={[S.card, { backgroundColor: step.remaining ? C.white : C.sage }]}>
        <View style={S.row}><View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.sage }}>{step.remaining ? <Txt style={{ fontSize: 12, fontWeight: '700' }}>{i + 1}</Txt> : <Icon name="check" size={18} />}</View><Txt style={{ fontWeight: '600', flex: 1 }}>{step.title}</Txt></View>
        <Txt muted>{step.remaining ? `${duration(step.remaining)} left` : 'Completed'}</Txt>
        <Button kind="outline" onPress={() => setOverlay({ type: 'progress', id: detailTask.id, stepId: step.id })}>{step.remaining ? 'Update progress' : 'Correct progress'}</Button>
      </View>)}
      {remaining(detailTask) > 0 && <Button onPress={() => setOverlay({ type: 'compare' })}>Review remaining plan</Button>}
      <Button kind="danger" onPress={() => setOverlay({ type: 'delete', id: detailTask.id })}>Delete task</Button>
    </Sheet>}
    {overlay?.type === 'settings' && <Sheet title="Your planning space" onClose={close}>
      <Notice>Demo time: {dateLabel(state.now, true)}, {state.now.split('T')[1]}.</Notice>
      {storageError && <Notice tone="amber">Saved data could not be read or written. This session still works.</Notice>}
      <Button kind="outline" onPress={() => setOverlay({ type: 'setup' })}>Edit weekly setup</Button>
      <Button kind="outline" onPress={() => setOverlay({ type: 'advance' })} disabled={state.now >= '2026-09-09T08:00' || !state.blocks.length}>Continue demo on Wednesday</Button>
      <Button kind="outline" icon="undo" disabled={!state.undo} onPress={undo}>Undo last change</Button>
      <Button kind="danger" onPress={() => setOverlay({ type: 'reset' })}>Reset sample week</Button>
      <Txt muted style={{ fontSize: 12 }}>Scores are reference loads built from what you entered. They are not measurements of health.</Txt>
    </Sheet>}
    {overlay?.type === 'advance' && <Sheet title="Continue on Wednesday?" onClose={close} footer={<Button onPress={() => { dispatch({ type: 'advance' }); setDay(WEEK[2]); setTab('home'); close(); setToast('Wednesday is ready. Set drafting to 210 minutes left to try the repair.'); }}>Confirm & jump to Wednesday</Button>}>
      <Notice>This demo action marks scheduled work before Wednesday as completed. It does not run automatically in normal use.</Notice>
      <Txt>On Wednesday, choose Partly done for the drafting step and enter 210 minutes remaining.</Txt>
    </Sheet>}
    {overlay?.type === 'reset' && <Sheet title="Start a fresh sample week?" onClose={close} footer={<Button kind="danger" onPress={() => { dispatch({ type: 'reset' }); setTab('home'); setDay(WEEK[0]); setDimension(undefined); setCompletedFilter(false); close(); setToast('Alex’s sample week restored.'); }}>Reset demo now</Button>}>
      <Txt>This removes this device’s tasks, progress and setup, and restores Alex’s original week. It cannot be undone.</Txt>
      <Button kind="outline" onPress={close}>Keep my current week</Button>
    </Sheet>}
    {overlay?.type === 'delete' && detailTask && <Sheet title="Remove this task?" onClose={close} footer={<Button kind="danger" onPress={() => { dispatch({ type: 'delete', taskId: detailTask.id }); close(); setToast('Task removed. You can undo this change.'); }}>Delete task and study blocks</Button>}>
      <Txt>{detailTask.title} and its study blocks will be removed. Fixed commitments and recovery stay in place.</Txt>
    </Sheet>}
  </SafeAreaView></View>;
}

export default function LoadTreeApp() {
  return <SafeAreaProvider><LoadTreeProvider><Application /></LoadTreeProvider></SafeAreaProvider>;
}
