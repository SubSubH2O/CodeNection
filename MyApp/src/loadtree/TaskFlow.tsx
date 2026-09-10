import React, { useState } from 'react';
import { View } from 'react-native';
import { AppState, Candidate, Task, WEEK, dateLabel, duration, remaining, taskErrors, time } from './model';
import { sampleTask } from './demo';
import { futureCoverage, planWork } from './planner';
import { Button, C, Chip, Field, Icon, Notice, S, Sheet, Title, Txt } from './ui';

export function TaskEditor({ initial, seed, onClose, onPlan }: { initial?: Task; seed?: Task; onClose: () => void; onPlan: (task: Task) => void }) {
  const [task, setTask] = useState<Task>(initial || seed || { id: `task-${Date.now()}`, title: '', demand: 'high', deadline: `${WEEK[4]}T12:00`, steps: [] });
  const [errors, setErrors] = useState<string[]>([]);
  const update = (id: string, patch: Partial<Task['steps'][number]>) => setTask(t => ({ ...t, steps: t.steps.map(s => s.id === id ? { ...s, ...patch } : s) }));
  const move = (i: number, delta: number) => { const steps = [...task.steps]; const other = i + delta; if (other < 0 || other >= steps.length) return; [steps[i], steps[other]] = [steps[other], steps[i]]; setTask({ ...task, steps }); };
  return <Sheet title={initial ? 'Edit your roadmap' : 'One thing at a time'} subtitle="Steps you can actually start." onClose={onClose} footer={<><View style={S.between}><Txt muted>Remaining work</Txt><Txt style={{ fontWeight: '700' }}>{duration(remaining(task))}</Txt></View><Button onPress={() => { const issues = taskErrors(task); setErrors(issues); if (!issues.length) onPlan(task); }} icon="calendar">Check how it fits</Button></>}>
    {!initial && <View style={{ gap: 10 }}><Chip>Prepared suggestions · no live AI</Chip><Button kind="outline" onPress={() => setTask(sampleTask('Marketing report', task.id))}>Use sample report</Button></View>}
    <Field label="What do you need to do?" placeholder="e.g. Marketing report" value={task.title} onChangeText={title => setTask({ ...task, title })} />
    <View style={S.row}><View style={{ flex: 2 }}><Field label="Due date (YYYY-MM-DD)" value={task.deadline.split('T')[0]} onChangeText={date => setTask({ ...task, deadline: `${date}T${task.deadline.split('T')[1] || '12:00'}` })} /></View><View style={{ flex: 1 }}><Field label="Time (HH:MM)" value={task.deadline.split('T')[1]} onChangeText={value => setTask({ ...task, deadline: `${task.deadline.split('T')[0]}T${value}` })} /></View></View>
    <View style={{ gap: 8 }}><Txt style={S.label}>Mental demand</Txt><View style={S.row}>{(['low', 'medium', 'high'] as const).map(demand => <Chip key={demand} active={demand === task.demand} onPress={() => setTask({ ...task, demand })}>{demand === 'low' ? 'Light' : demand === 'medium' ? 'Moderate' : 'Focused'}</Chip>)}</View></View>
    <View style={S.divider} /><View style={S.between}><Title small>Your roadmap</Title><Txt muted>{task.steps.length} steps</Txt></View><Txt muted style={{ fontSize: 13 }}>Estimates are a starting point. Edit anything.</Txt>
    {task.steps.map((step, i) => <View key={step.id} style={S.card}><Field label={`Step ${i + 1}`} value={step.title} onChangeText={title => update(step.id, { title })} /><Field label="Minutes left" keyboardType="number-pad" value={String(step.remaining)} onChangeText={v => update(step.id, { remaining: Number(v), estimate: Math.max(15, Number(v)) })} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}><Button kind="quiet" disabled={i === 0} onPress={() => move(i, -1)}>Move up</Button><Button kind="quiet" disabled={i === task.steps.length - 1} onPress={() => move(i, 1)}>Move down</Button><Button kind="quiet" onPress={() => setTask({ ...task, steps: task.steps.filter(s => s.id !== step.id) })}>Remove</Button></View></View>)}
    <Button kind="outline" icon="plus" onPress={() => setTask({ ...task, steps: [...task.steps, { id: `step-${Date.now()}`, title: '', estimate: 30, remaining: 30 }] })}>Add a step</Button>
    <Txt muted style={{ fontSize: 12 }}>15-minute increments. Nothing is saved until you approve a plan.</Txt>
    {errors.length > 0 && <Notice tone="red">{errors.join('\n')}</Notice>}
  </Sheet>;
}

export function Comparison({ state, draft, onClose, onEdit, onPreview, onSetup, onKeep }: { state: AppState; draft?: Task; onClose: () => void; onEdit: (t: Task) => void; onPreview: (p: Candidate) => void; onSetup: () => void; onKeep: (t: Task) => void }) {
  const tasks = draft ? [...state.tasks.filter(t => t.id !== draft.id), draft] : state.tasks;
  const result = planWork(state, tasks);
  const target = draft || tasks.find(t => remaining(t) > 0);
  const noFit = result.candidates.length === 0;
  return <Sheet title={noFit ? 'Let’s make room honestly' : 'A little give. A little take.'} subtitle="Capacity checkpoint · You choose what changes" onClose={onClose}>
    <View style={{ backgroundColor: noFit || result.shortfall ? C.amberBg : C.sage, padding: 22, gap: 12, borderRadius: 22 }}><View style={S.between}><Icon name="clock" color={C.amber} /><Chip tone="amber">{noFit ? 'Needs a decision' : result.shortfall ? 'A change is needed' : 'Your work can fit'}</Chip></View><Title small>{duration(result.required)} to make room for.</Title><Txt>{result.shortfall ? `Your current study windows leave ${duration(result.shortfall)} unscheduled. ${noFit ? 'The planning strategies found no complete plan with these constraints.' : 'An eligible move can create the space you need.'}` : 'We found two ways to approach your week.'}</Txt>{target && <Txt muted style={{ fontSize: 13 }}>Due {dateLabel(target.deadline)} at {target.deadline.split('T')[1]}</Txt>}</View>
    {!draft && target && <Notice>{duration(futureCoverage(state, target))} currently scheduled · {duration(remaining(target))} remaining for {target.title}.</Notice>}
    {noFit && draft && <Button kind="outline" onPress={() => onKeep(draft)}>Keep task unscheduled</Button>}
    {result.candidates.map((plan, i) => {
      const newStudy = plan.blocks.filter(b => `${b.date}T${time(b.start)}` >= state.now);
      const first = newStudy[0];
      return <View key={plan.id} style={[S.card, { borderColor: i === 0 ? '#AEC4A3' : C.line, gap: 16 }]}><View style={S.between}><Chip>{i === 0 ? 'Suggested starting point' : 'Another way'}</Chip><Icon name={plan.movedId ? 'errands' : 'leaf'} /></View><Title small>{plan.title}</Title><Txt muted>{plan.description}</Txt><View style={{ borderLeftWidth: 2, borderColor: C.amber, paddingLeft: 12, gap: 4 }}><Txt style={{ fontSize: 12, fontWeight: '700', color: C.amber }}>The trade-off</Txt><Txt>{plan.tradeOff}</Txt></View><View style={S.row}><Icon name="lock" size={16} /><Txt style={{ fontSize: 13 }}>Fixed commitments & recovery protected</Txt></View>{first && <Txt muted style={{ fontSize: 12 }}>First study block: {dateLabel(first.date)}, {time(first.start)}</Txt>}<Button onPress={() => onPreview(plan)} kind={i === 0 ? 'primary' : 'outline'}>Preview this plan</Button></View>;
    })}
    {noFit && <><Txt muted>A later deadline is something to discuss with your lecturer. LoadTree will keep the original deadline until you confirm an approved change.</Txt>{target && <Button kind="outline" onPress={() => onEdit(target)}>Review estimates or deadline</Button>}<Button kind="outline" onPress={onSetup}>Review weekly availability</Button><Notice>Your saved calendar is unchanged. You can close this screen and return to the decision later.</Notice></>}
    {!noFit && target && <Button kind="quiet" onPress={() => onEdit(target)}>Adjust the roadmap</Button>}
  </Sheet>;
}

export function Progress({ task, stepId, onClose, onSave }: { task: Task; stepId: string; onClose: () => void; onSave: (minutes: number) => void }) {
  const step = task.steps.find(s => s.id === stepId)!;
  const [choice, setChoice] = useState<'done' | 'partly' | 'not' | null>(null);
  const [minutes, setMinutes] = useState(String(step.remaining));
  const [error, setError] = useState('');
  return <Sheet title="How did it go?" subtitle={task.title} onClose={onClose} footer={<Button disabled={!choice} onPress={() => {
    const value = choice === 'done' ? 0 : choice === 'not' ? step.remaining : Number(minutes);
    if (!Number.isInteger(value) || value < 0 || value > 1440 || value % 15 || (choice === 'partly' && (!minutes.trim() || value === 0))) { setError('Use 15-minute increments from 15 to 1,440 minutes, or choose Done.'); return; }
    onSave(value);
  }}>Save progress</Button>}>
    <Title small>{step.title}</Title><Txt muted>{duration(step.remaining)} left. A change of plan is part of the process.</Txt>
    {(['done', 'partly', 'not'] as const).map(c => <Button key={c} kind={choice === c ? 'primary' : 'outline'} onPress={() => setChoice(c)}>{c === 'done' ? 'Done' : c === 'partly' ? 'Partly done' : 'Not started'}</Button>)}
    {choice === 'partly' && <><Field label="How many minutes are still needed?" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" /><Txt muted>Include all the work left in this step, even if the estimate has grown.</Txt></>}
    {choice === 'not' && <Notice>We’ll keep the remaining estimate and check how it fits. Nothing moves without your approval.</Notice>}
    {error && <Notice tone="red">{error}</Notice>}
  </Sheet>;
}
