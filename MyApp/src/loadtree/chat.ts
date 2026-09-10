import { AppState, Candidate, Step, Task, WEEK, dateLabel, duration, remaining, validDate } from './model';
import { sampleTask, seedTask } from './demo';
import { planWork } from './planner';

export type Role = 'user' | 'assistant';
export interface Chip { label: string; send: string }
export interface Message {
  id: string;
  role: Role;
  text: string;
  at: string;
  chips?: Chip[];
  plans?: Candidate[];
  task?: Task;
}

/** What the assistant has gathered so far. An LLM would fill exactly this shape. */
export interface Draft {
  title?: string;
  deadline?: string;
  steps?: Step[];
  awaiting?: 'deadline' | 'effort' | 'confirm';
}

export interface Turn { messages: Message[]; draft: Draft }

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

let counter = 0;
const id = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`;
export const say = (role: Role, text: string, extra: Partial<Message> = {}): Message =>
  ({ id: id(), role, text, at: new Date().toISOString(), ...extra });

/** Maps day words in free text onto the demo week. Returns a YYYY-MM-DDTHH:MM stamp. */
export function parseDeadline(text: string, now: string): string | undefined {
  const lower = text.toLowerCase();
  const explicit = lower.match(/(\d{4}-\d{2}-\d{2})/);
  if (explicit && validDate(explicit[1])) return `${explicit[1]}T12:00`;
  if (/\btoday\b/.test(lower)) return `${now.slice(0, 10)}T23:59`;
  if (/\btomorrow\b/.test(lower)) {
    const index = WEEK.indexOf(now.slice(0, 10));
    if (index >= 0 && index < WEEK.length - 1) return `${WEEK[index + 1]}T23:59`;
  }
  for (let i = 0; i < DAYS.length; i++) {
    if (new RegExp(`\\b${DAYS[i]}\\b`).test(lower)) return `${WEEK[i]}T12:00`;
  }
  return undefined;
}

/** Reads "3 hours", "90 mins", "1.5h" into whole 15-minute blocks. */
export function parseMinutes(text: string): number | undefined {
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  if (hours) return Math.max(15, Math.round((parseFloat(hours[1]) * 60) / 15) * 15);
  const mins = text.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
  if (mins) return Math.max(15, Math.round(parseInt(mins[1], 10) / 15) * 15);
  const bare = text.trim().match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return Math.max(15, Math.round((parseFloat(bare[1]) * 60) / 15) * 15);
  return undefined;
}

function evenSteps(title: string, total: number, taskId: string): Step[] {
  const names = ['Gather what you need', 'Outline the shape of it', 'Do the main work', 'Review and finish'];
  const per = Math.max(15, Math.round(total / names.length / 15) * 15);
  const steps = names.map((name, i) => ({ id: `${taskId}-s${i}`, title: name, estimate: per, remaining: per }));
  const drift = total - per * names.length;
  if (drift !== 0) {
    const last = steps[steps.length - 1];
    last.remaining = Math.max(15, last.remaining + drift);
    last.estimate = last.remaining;
  }
  return steps;
}

const draftToTask = (draft: Draft): Task => ({
  id: `task-${Date.now()}`,
  title: draft.title || 'Untitled task',
  deadline: draft.deadline || `${WEEK[4]}T12:00`,
  demand: 'high',
  steps: draft.steps || [],
});

export function offerPlans(state: AppState, draft: Draft): Turn {
  const task = draftToTask(draft);
  const tasks = [...state.tasks, task];
  const result = planWork(state, tasks);
  if (!result.candidates.length) {
    return {
      draft: {},
      messages: [say('assistant',
        `${duration(result.required)} of work, but your study windows leave ${duration(result.shortfall)} unscheduled before ${dateLabel(task.deadline)}. Nothing fits without changing something.`,
        { task, chips: [{ label: 'Shorten the estimate', send: 'shorten' }, { label: 'Edit my study windows', send: 'windows' }] })],
    };
  }
  const summary = result.candidates.length === 1
    ? 'I found one way this fits.'
    : `I found ${result.candidates.length} ways this fits.`;
  return {
    draft: {},
    messages: [say('assistant',
      `${summary} Every option keeps your fixed commitments and protected recovery. Pick one to preview it on your calendar.`,
      { task, plans: result.candidates })],
  };
}

/**
 * The whole conversation, decided locally. This is the seam an LLM replaces:
 * it would return the same Draft and message text, and the planner below it
 * would still be the only thing that touches the calendar.
 */
export function reply(state: AppState, draft: Draft, text: string): Turn {
  const input = text.trim();
  if (!input) return { draft, messages: [] };

  if (draft.awaiting === 'deadline') {
    const deadline = parseDeadline(input, state.now);
    if (!deadline) {
      return { draft, messages: [say('assistant', 'I did not catch a day there. Which day is it due?', { chips: weekChips() })] };
    }
    const next = { ...draft, deadline, awaiting: 'effort' as const };
    return { draft: next, messages: [say('assistant', `Due ${dateLabel(deadline)}. Roughly how long do you think it needs?`, { chips: effortChips() })] };
  }

  if (draft.awaiting === 'effort') {
    const minutes = parseMinutes(input);
    if (!minutes) {
      return { draft, messages: [say('assistant', 'Give me a rough number — an hour, two hours, whatever feels right.', { chips: effortChips() })] };
    }
    const task = draftToTask(draft);
    const next = { ...draft, steps: evenSteps(draft.title || '', minutes, task.id) };
    const plans = offerPlans(state, next);
    return {
      draft: plans.draft,
      messages: [say('assistant', `${duration(minutes)}, split into four steps you can start. Checking how that fits…`), ...plans.messages],
    };
  }

  // A fresh request.
  const deadline = parseDeadline(input, state.now);
  const seeded = seedTask(input);
  const title = seeded.title || input;

  if (seeded.steps.length) {
    const next: Draft = { title, deadline: deadline || seeded.deadline, steps: seeded.steps };
    const plans = offerPlans(state, next);
    return {
      draft: plans.draft,
      messages: [
        say('assistant', `“${title}” — I have a roadmap for this shape of task: ${seeded.steps.length} steps, ${duration(remaining(seeded))} in total, due ${dateLabel(next.deadline!)}.`),
        ...plans.messages,
      ],
    };
  }

  if (!deadline) {
    return { draft: { title, awaiting: 'deadline' }, messages: [say('assistant', `Got it — “${title}”. When is it due?`, { chips: weekChips() })] };
  }
  return {
    draft: { title, deadline, awaiting: 'effort' },
    messages: [say('assistant', `“${title}”, due ${dateLabel(deadline)}. Roughly how long does it need?`, { chips: effortChips() })],
  };
}

const weekChips = (): Chip[] => [
  { label: 'Wednesday', send: 'Wednesday' },
  { label: 'Friday', send: 'Friday' },
  { label: 'Sunday', send: 'Sunday' },
];
const effortChips = (): Chip[] => [
  { label: '1 hour', send: '1 hour' },
  { label: '3 hours', send: '3 hours' },
  { label: '5 hours', send: '5 hours' },
];

export const OPENING: Message[] = [
  say('assistant', 'Tell me what needs doing and I will turn it into steps, then check how it fits around your week. Nothing reaches your calendar until you approve it.'),
];

export const sampleOpener = () => `Marketing report due Friday`;
export { sampleTask };
