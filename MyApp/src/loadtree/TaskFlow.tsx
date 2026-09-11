import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AppState, Candidate, Task, WEEK, dateLabel, duration, remaining, taskErrors, time } from './model';
import { sampleTask } from './demo';
import { futureCoverage, planWork } from './planner';
import { Button, C, Chip, Field, Icon, Notice, S, Sheet, Stepper, Title, Txt } from './ui';

const minutesLabel = (m: number) => (m < 60 ? `${m} min` : duration(m));
const DUE_TIMES: [string, string][] = [['09:00', '9:00 AM'], ['12:00', '12:00 PM'], ['17:00', '5:00 PM'], ['23:59', '11:59 PM']];
const clock12 = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const dueLabel = (deadline: string) => {
  const [date, at] = deadline.split('T');
  const d = new Date(`${date}T12:00:00`);
  return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${clock12(at || '23:59')}`;
};

/** The vertical "more" mark on each step. */
function MoreDots() {
  return <View style={{ gap: 3, alignItems: 'center' }}>{[0, 1, 2].map(i => <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.muted }} />)}</View>;
}

export function TaskEditor({ initial, seed, onClose, onPlan }: { initial?: Task; seed?: Task; onClose: () => void; onPlan: (task: Task) => void }) {
  const [task, setTask] = useState<Task>(initial || seed || { id: `task-${Date.now()}`, title: '', demand: 'high', deadline: `${WEEK[4]}T23:59`, steps: [] });
  const [errors, setErrors] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [dueOpen, setDueOpen] = useState(false);
  const update = (id: string, patch: Partial<Task['steps'][number]>) => setTask(t => ({ ...t, steps: t.steps.map(s => (s.id === id ? { ...s, ...patch } : s)) }));
  const move = (i: number, delta: number) => { const steps = [...task.steps]; const other = i + delta; if (other < 0 || other >= steps.length) return; [steps[i], steps[other]] = [steps[other], steps[i]]; setTask({ ...task, steps }); };
  const [date, at] = task.deadline.split('T');
  const setDue = (d: string, t: string) => setTask({ ...task, deadline: `${d}T${t}` });
  const submit = () => { const issues = taskErrors(task); setErrors(issues); if (!issues.length) onPlan(task); };

  return <Sheet nav title={initial ? 'Edit task' : 'New task'} onClose={onClose}
    footer={<>
      <View style={[S.between, { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: C.surface }]}>
        <Txt muted style={{ fontSize: 15 }}>Remaining work</Txt>
        <Txt style={{ fontSize: 17, fontWeight: '800' }}>{duration(remaining(task))}</Txt>
      </View>
      <Button onPress={submit} icon="calendar">Check how it fits</Button>
    </>}>
    {errors.length > 0 && <Txt style={{ color: C.red, fontSize: 14 }}>{errors.join('\n')}</Txt>}

    <View style={{ gap: 4 }}>
      <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>Task name</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderColor: C.line }}>
        <TextInput accessibilityLabel="Task name" value={task.title} onChangeText={title => setTask({ ...task, title })} placeholder="e.g. Marketing report" placeholderTextColor={C.muted}
          style={{ flex: 1, fontSize: 20, color: C.ink, paddingVertical: 10 }} />
        {!!task.title && <Pressable accessibilityRole="button" accessibilityLabel="Clear the name" onPress={() => setTask({ ...task, title: '' })} hitSlop={8}
          style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={14} color={C.white} />
        </Pressable>}
      </View>
    </View>

    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: dueOpen }} accessibilityLabel={`Due ${dueLabel(task.deadline)}`} onPress={() => setDueOpen(!dueOpen)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
        <Icon name="calendar" size={26} color={C.muted} />
        <View style={{ flex: 1 }}>
          <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>Due</Txt>
          <Txt style={{ fontSize: 16.5 }}>{dueLabel(task.deadline)}</Txt>
        </View>
        <View style={{ transform: [{ rotate: dueOpen ? '90deg' : '0deg' }] }}><Icon name="forward" size={18} color={C.muted} /></View>
      </Pressable>
      {dueOpen && <View style={{ gap: 10, paddingLeft: 40, paddingTop: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {WEEK.map(d => <Chip key={d} active={d === date} onPress={() => setDue(d, at || '23:59')}>{new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</Chip>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {DUE_TIMES.map(([value, label]) => <Chip key={value} active={value === at} onPress={() => setDue(date, value)}>{label}</Chip>)}
        </View>
      </View>}
    </View>

    <View style={{ flexDirection: 'row', gap: 14 }}>
      <Icon name="mental" size={26} color={C.muted} />
      <View style={{ flex: 1, gap: 10 }}>
        <Txt muted style={{ fontSize: 13, fontWeight: '600' }}>Mental demand</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['low', 'medium', 'high'] as const).map(demand => {
            const on = demand === task.demand;
            return <Pressable key={demand} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setTask({ ...task, demand })}
              style={{ paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: 16, backgroundColor: on ? C.green : C.sage }}>
              <Txt style={{ fontSize: 15, fontWeight: '700', color: on ? C.white : C.green }}>{demand === 'low' ? 'Light' : demand === 'medium' ? 'Moderate' : 'Focused'}</Txt>
            </Pressable>;
          })}
        </View>
      </View>
    </View>

    <View style={{ borderTopWidth: 1, borderColor: C.line, paddingTop: 18 }}>
      <View style={[S.between, { marginBottom: 6 }]}>
        <Txt accessibilityRole="header" style={{ fontSize: 21, fontWeight: '800' }}>Steps</Txt>
        <Txt muted style={{ fontSize: 14 }}>{task.steps.length} {task.steps.length === 1 ? 'step' : 'steps'} · {duration(remaining(task))}</Txt>
      </View>
      {task.steps.map((step, i) => {
        const editing = open === step.id;
        return <View key={step.id} style={{ borderBottomWidth: 1, borderColor: C.line }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: editing }} accessibilityLabel={`Step ${i + 1}, ${step.title || 'untitled'}, ${minutesLabel(step.remaining)}`} onPress={() => setOpen(editing ? null : step.id)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 15, fontWeight: '700', color: C.green }}>{i + 1}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 16.5, lineHeight: 22 }}>{step.title || 'Untitled step'}</Txt>
              <Txt muted style={{ fontSize: 14 }}>{minutesLabel(step.remaining)}</Txt>
            </View>
            <View style={{ padding: 8 }}><MoreDots /></View>
          </Pressable>
          {/* Editing opens in place, under the step it belongs to. */}
          {editing && <View style={{ gap: 10, paddingLeft: 54, paddingBottom: 14 }}>
            <TextInput accessibilityLabel={`Step ${i + 1} name`} autoFocus={!step.title} value={step.title} onChangeText={title => update(step.id, { title })} placeholder="What’s the step?" placeholderTextColor={C.muted}
              style={{ fontSize: 16, color: C.ink, paddingVertical: 8, borderBottomWidth: 1, borderColor: C.green }} />
            <View style={S.between}>
              <Txt muted style={{ fontSize: 14 }}>Time</Txt>
              <Stepper label={`time for step ${i + 1}`} value={minutesLabel(step.remaining)}
                onMinus={() => update(step.id, { remaining: Math.max(15, step.remaining - 15), estimate: Math.max(15, step.remaining - 15) })}
                onPlus={() => update(step.id, { remaining: Math.min(600, step.remaining + 15), estimate: Math.min(600, step.remaining + 15) })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 18 }}>
              {i > 0 && <Pressable accessibilityRole="button" onPress={() => move(i, -1)} hitSlop={6}><Txt style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>Move up</Txt></Pressable>}
              {i < task.steps.length - 1 && <Pressable accessibilityRole="button" onPress={() => move(i, 1)} hitSlop={6}><Txt style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>Move down</Txt></Pressable>}
              <Pressable accessibilityRole="button" onPress={() => { setTask({ ...task, steps: task.steps.filter(s => s.id !== step.id) }); setOpen(null); }} hitSlop={6}><Txt style={{ color: C.red, fontWeight: '700', fontSize: 14 }}>Delete</Txt></Pressable>
            </View>
          </View>}
        </View>;
      })}
      <Pressable accessibilityRole="button" onPress={() => { const id = `step-${Date.now()}`; setTask({ ...task, steps: [...task.steps, { id, title: '', estimate: 30, remaining: 30 }] }); setOpen(id); }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, opacity: pressed ? 0.6 : 1 })}>
        <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: C.green, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={20} /></View>
        <Txt style={{ fontSize: 16.5, fontWeight: '700', color: C.green }}>Add step</Txt>
      </Pressable>
    </View>
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
    {choice === 'not' && <Txt muted>We’ll check how the rest fits.</Txt>}
    {error && <Notice tone="red">{error}</Notice>}
  </Sheet>;
}
