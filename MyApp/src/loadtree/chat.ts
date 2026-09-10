import { AppState, Commitment, Step, Task, WEEK, dateLabel, duration, remaining, time } from './model';
import { NOUNS } from './conflict';
import { Outcome, Request } from './flow';
import { planChanges } from './planChanges';

export type Role = 'user' | 'assistant';
export interface Chip { label: string; send?: string; action?: 'calendar' | 'edit' }
/** A task broken into steps, shown as one compact card instead of a paragraph. */
export interface TaskCard { title: string; due: string; total: string; steps: { title: string; minutes: number }[] }
export interface Message { id: string; role: Role; text: string; at: string; chips?: Chip[]; card?: TaskCard }

/** Everything gathered so far. The optional AI extractor fills the same shape. */
export interface Draft {
  title?: string;
  deadline?: string;
  minutes?: number;
  steps?: Step[];
  commitment?: Commitment;
  event?: { title: string; kind: Commitment['kind']; dimension: Commitment['dimension']; date?: string };
  awaiting?: 'deadline' | 'effort' | 'day' | 'time' | 'confirm';
  /** Built and shown, waiting for the student to say it looks right. */
  proposal?: Request;
}
/** One exchange. `ready` means the planner has enough to act on. */
export interface Turn { messages: Message[]; draft: Draft; ready?: Request }

let counter = 0;
export const say = (role: Role, text: string, extra: Partial<Message> = {}): Message =>
  ({ id: `m${Date.now().toString(36)}${(counter++).toString(36)}`, role, text, at: new Date().toISOString(), ...extra });

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight';
const TASK_WORDS = /\b(assignment|report|essay|paper|thesis|dissertation|project|coursework|homework|revision|revise|revising|exam|midterm|quiz|test|presentation|slides|study|studying|reading|problem set|pset|write-?up|portfolio)\b/i;
const CHATTER = /^(hi|hello|hey|yo|thanks|thank you|ok|okay|cool|nice|great|sure)\b[\s!.]*$/i;

const STARTERS: Chip[] = [
  // Sized so both examples work in either order: small enough to leave the
  // gym-or-Monday dilemma intact, and still fits after either choice.
  { label: 'Lab report due Friday, 1 hour', send: 'Lab report due Friday, about 1 hour' },
  { label: 'Work Friday 6pm to 10pm', send: 'I have work Friday from 6pm to 10pm' },
];
const HELP = 'Tell me about a deadline or a commitment — for example “Essay due Thursday, about 3 hours” or “Work Friday 6pm to 10pm”.';

export const opening = (): Message[] => [
  say('assistant', 'What’s coming up?', { chips: STARTERS }),
];

function resolveDay(word: string, now: string): string | undefined {
  const w = word.toLowerCase();
  const today = now.slice(0, 10);
  if (w === 'today' || w === 'tonight') return today;
  if (w === 'tomorrow') {
    const i = WEEK.indexOf(today);
    return i >= 0 && i < WEEK.length - 1 ? WEEK[i + 1] : undefined;
  }
  const i = WEEKDAYS.indexOf(w);
  return i >= 0 ? WEEK[i] : undefined;
}

const RANGE = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?!\s*(?:h\b|hrs?\b|hours?\b|mins?\b|minutes?\b|days?\b|weeks?\b|pages?\b|words?\b|%|\d))/gi;

/** A time range — "6pm to 10pm", "6-10pm", "11-2pm", "9-5", "18:00–22:00" — in minutes past midnight. */
export function readRange(text: string): { start: number; end: number; index: number } | null {
  for (const m of text.matchAll(RANGE)) {
    const index = m.index ?? 0;
    // Digits inside a longer number or a date ("2026-09-11") are not a time.
    if (index > 0 && /[\d:-]/.test(text[index - 1])) continue;
    const [, h1, m1, a1, h2, m2, a2] = m;
    const clock = (h: string, mm: string | undefined, suffix?: string) => {
      let hour = Number(h);
      const s = suffix?.toLowerCase();
      if (s === 'pm' && hour < 12) hour += 12;
      if (s === 'am' && hour === 12) hour = 0;
      return hour * 60 + Number(mm ?? 0);
    };
    let start = clock(h1, m1, a1 ?? a2);
    let end = clock(h2, m2, a2);
    if (!a1 && a2 && start >= end) start = clock(h1, m1, 'am');       // "11-2pm" is 11am to 2pm
    if (!a1 && !a2) {
      if (Number(h1) < 8 && Number(h2) <= 12) { start += 720; end += 720; } // "6-10" is an evening
      else if (end <= start) end += 720;                                 // "9-5" crosses noon
    }
    if (Number(h1) > 23 || Number(h2) > 24 || end <= start || end > 1440) continue;
    return { start: Math.round(start / 15) * 15, end: Math.round(end / 15) * 15, index };
  }
  return null;
}

/** "about 5 hours", "1h 30m", "90 mins", "3-4 hours". A bare number only counts as an answer. */
export function minutesFrom(text: string, answer = false): number | undefined {
  const t = text.toLowerCase();
  const snap = (m: number) => Math.min(1440, Math.max(15, Math.round(m / 15) * 15));
  const span = /(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:h\b|hrs?\b|hours?\b)/.exec(t);
  if (span) return snap(((Number(span[1]) + Number(span[2])) / 2) * 60);
  const hours = /(\d+(?:\.\d+)?)\s*(?:h\b|hrs?\b|hours?\b)/.exec(t);
  const mins = /(\d+)\s*(?:m\b|mins?\b|minutes?\b)/.exec(t);
  if (hours || mins) return snap((hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0));
  if (/\ban hour and a half\b/.test(t)) return 90;
  if (/\bhalf an hour\b/.test(t)) return 30;
  if (/\b(?:an|one) hour\b/.test(t)) return 60;
  if (/\ba couple of hours\b/.test(t)) return 120;
  if (answer) {
    const bare = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(t);
    if (bare) { const n = Number(bare[1]); return snap(n <= 12 ? n * 60 : n); }
  }
  return undefined;
}

/** In a sentence a day must be tied to "due", "by" or "before" to be a deadline; as an answer, any day counts. */
export function deadlineFrom(text: string, now: string, answer = false): string | undefined {
  const lower = text.toLowerCase();
  const hit = new RegExp(`\\b(?:due|by|before|deadline(?: is)?|until)\\s+(?:on\\s+|this\\s+)?(${DAY})\\b`).exec(lower)
    ?? (answer ? new RegExp(`\\b(${DAY})\\b`).exec(lower) : new RegExp(`\\bon\\s+(?:this\\s+)?(${DAY})\\b`).exec(lower));
  if (!hit) return undefined;
  const date = resolveDay(hit[1], now);
  if (!date) return undefined;
  const after = lower.slice(hit.index + hit[0].length, hit.index + hit[0].length + 20);
  if (/^\s*(?:at\s+)?noon\b/.test(after)) return `${date}T12:00`;
  // "Friday 6pm to 10pm" is when an event happens, not when something is due.
  const at = /^\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b(?!\s*(?:-|–|to|until))/.exec(after);
  if (at) {
    let hour = Number(at[1]);
    if (at[3] === 'pm' && hour < 12) hour += 12;
    if (at[3] === 'am' && hour === 12) hour = 0;
    return `${date}T${String(hour).padStart(2, '0')}:${at[2] ?? '00'}`;
  }
  return `${date}T23:59`;
}

/** "I need to finish my database assignment by Friday, probably 3 hours" → "Database assignment". */
export function cleanTitle(input: string): string {
  let t = ` ${input} `;
  const cut = t.search(/\b(?:due|by|before|deadline|until)\b|,\s*(?:about|around|roughly|probably|maybe)\b|\b(?:about|around|roughly|probably|maybe)\s+\d|\b\d+(?:\.\d+)?\s*(?:h|hrs?|hours?|mins?|minutes?)\b|\b(?:and|but)\s+(?:i\s+)?(?:have|got|also)\b|\b(?:on|this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (cut > 0) t = t.slice(0, cut);
  t = t.replace(/^\s*(?:i\s+)?(?:really\s+)?(?:need|have|got|must|want|should)\s+to\s+/i, ' ')
    .replace(/^\s*(?:finish|complete|do|work on|start on|start|get)\s+/i, ' ')
    .replace(/^\s*(?:my|the|a|an|our)\s+/i, ' ')
    .replace(/[.,;:!?\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t ? `${t[0].toUpperCase()}${t.slice(1)}`.slice(0, 48) : 'New task';
}

const TEMPLATES: { match: RegExp; steps: [string, number][]; typical: number }[] = [
  { match: /database|sql|schema/i, steps: [['Research schema', 20], ['Build the database', 35], ['Write SQL queries', 30], ['Final review', 15]], typical: 180 },
  { match: /presentation|slides|pitch/i, steps: [['Research the topic', 30], ['Build the slides', 45], ['Rehearse', 25]], typical: 180 },
  { match: /\blab\b|experiment/i, steps: [['Prepare the method', 25], ['Analyse the results', 35], ['Write it up', 40]], typical: 120 },
  { match: /revis|exam|midterm|quiz|\btest\b|study/i, steps: [['Review your notes', 30], ['Practice questions', 30], ['Timed past paper', 25], ['Final recap', 15]], typical: 240 },
  { match: /report|essay|paper|thesis|dissertation|write-?up/i, steps: [['Gather sources', 20], ['Outline the argument', 15], ['Write the draft', 45], ['Edit & submit', 20]], typical: 300 },
  { match: /reading|chapter/i, steps: [['Skim and plan', 20], ['Read closely', 60], ['Make notes', 20]], typical: 120 },
  { match: /project|assignment|coursework|homework|problem set|pset/i, steps: [['Plan the approach', 25], ['Do the main work', 55], ['Check & submit', 20]], typical: 180 },
];
const FALLBACK = { match: /./, steps: [['Get started', 25], ['Main work', 55], ['Wrap up', 20]] as [string, number][], typical: 120 };
const templateFor = (title: string) => TEMPLATES.find(t => t.match.test(title)) ?? FALLBACK;
const taskId = (state: AppState, title: string) => `task-${state.revision}-${title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)}`;

/** Splits the effort across the task's natural steps in 15-minute units, with nothing lost to rounding. */
export function buildTask(state: AppState, title: string, deadline: string, minutes: number): Task {
  const { steps } = templateFor(title);
  const units = Math.max(1, Math.round(minutes / 15));
  const count = Math.min(steps.length, units);
  // Tiny tasks keep their last step so they still end with a finish.
  const chosen = count === steps.length ? steps : [...steps.slice(0, count - 1), steps[steps.length - 1]];
  const weight = chosen.reduce((sum, [, w]) => sum + w, 0);
  const raw = chosen.map(([, w]) => (w / weight) * units);
  const alloc = raw.map(r => Math.max(1, Math.floor(r)));
  let left = units - alloc.reduce((a, b) => a + b, 0);
  const byFraction = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f);
  for (let k = 0; left > 0; k++, left--) alloc[byFraction[k % byFraction.length].i]++;
  while (left < 0) { const i = alloc.indexOf(Math.max(...alloc)); alloc[i]--; left++; }
  const id = taskId(state, title);
  return { id, title, deadline, demand: 'high', steps: chosen.map(([name], i) => ({ id: `${id}-s${i}`, title: name, estimate: alloc[i] * 15, remaining: alloc[i] * 15 })) };
}

function fromSteps(state: AppState, title: string, deadline: string, steps: Step[]): Task {
  const id = taskId(state, title);
  return { id, title, deadline, demand: 'high', steps: steps.map((s, i) => ({ ...s, id: `${id}-s${i}` })) };
}

/** The day word nearest before the time range, so "report due Thursday and work Friday 6-10" picks Friday. */
function eventDay(text: string, now: string, rangeIndex?: number): string | undefined {
  const hits = [...text.matchAll(new RegExp(`\\b(${DAY})\\b`, 'gi'))];
  if (!hits.length) return undefined;
  if (rangeIndex === undefined) return resolveDay(hits[0][1], now);
  const before = hits.filter(h => (h.index ?? 0) < rangeIndex);
  return resolveDay((before.length ? before[before.length - 1] : hits[0])[1], now);
}

const makeCommitment = (event: NonNullable<Draft['event']>, date: string, start: number, end: number): Commitment => ({
  id: `event-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${date}-${start}`,
  title: event.title, date, start, end, kind: event.kind, dimension: event.dimension, demand: 'medium',
});

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function existingTask(state: AppState, title: string): Task | undefined {
  const wanted = norm(title);
  return state.tasks.find(task => {
    const have = norm(task.title);
    return have === wanted || (wanted.length >= 5 && (have.includes(wanted) || wanted.includes(have)));
  });
}

const cardFor = (task: Task): TaskCard => ({
  title: task.title,
  due: `Due ${dateLabel(task.deadline)}${task.deadline.endsWith('23:59') ? '' : `, ${task.deadline.slice(11)}`}`,
  total: duration(remaining(task)),
  steps: task.steps.map(s => ({ title: s.title, minutes: s.remaining })),
});

function dayChips(state: AppState): Chip[] {
  const today = Math.max(0, WEEK.indexOf(state.now.slice(0, 10)));
  const ahead = WEEK.slice(today + 1);
  const picks = [ahead[1], ahead[3], ahead[ahead.length - 1]].filter((d, i, all): d is string => !!d && all.indexOf(d) === i);
  return picks.map(d => { const name = new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' }); return { label: name, send: name }; });
}
const effortLabel = (m: number) => (m % 60 ? `${m} minutes` : `${m / 60} ${m === 60 ? 'hour' : 'hours'}`);
function effortChips(title: string, below?: number): Chip[] {
  const values = below
    ? [30, 60, 90, 120, 180, 240, 300].filter(v => v < below).slice(-3)
    : [...new Set([60, 120, templateFor(title).typical])].sort((a, b) => a - b);
  return values.map(v => ({ label: effortLabel(v), send: effortLabel(v) }));
}
const timeChips = (): Chip[] => ['9am to 5pm', '2pm to 6pm', '6pm to 10pm'].map(t => ({ label: t, send: t }));

/** The next thing to ask, if anything is still missing. One question at a time. */
function nextQuestion(state: AppState, d: Draft): { awaiting: NonNullable<Draft['awaiting']>; message: Message } | null {
  if (d.event && !d.commitment) {
    const what = d.event.title.toLowerCase();
    if (!d.event.date) return { awaiting: 'day', message: say('assistant', `Which day is ${what}?`, { chips: dayChips(state) }) };
    return { awaiting: 'time', message: say('assistant', `What time is ${what} on ${dateLabel(d.event.date)}?`, { chips: timeChips() }) };
  }
  if (d.title && !existingTask(state, d.title)) {
    if (!d.deadline) return { awaiting: 'deadline', message: say('assistant', `Got it — “${d.title}”. When is it due?`, { chips: dayChips(state) }) };
    if (!d.minutes && !d.steps?.length) return { awaiting: 'effort', message: say('assistant', `Roughly how long will “${d.title}” take? A guess is fine.`, { chips: effortChips(d.title) }) };
  }
  return null;
}

/** Either asks the next question or hands a complete request to the planner. */
export function settle(state: AppState, d: Draft): Turn {
  const ask = nextQuestion(state, d);
  if (ask) return { draft: { ...d, awaiting: ask.awaiting }, messages: [ask.message] };

  const existing = d.title ? existingTask(state, d.title) : undefined;
  const task = d.title && !existing && d.deadline
    ? (d.steps?.length ? fromSteps(state, d.title, d.deadline, d.steps) : buildTask(state, d.title, d.deadline, d.minutes!))
    : undefined;
  const messages: Message[] = [];
  if (existing) messages.push(say('assistant', `${existing.title} is already on your calendar — ${duration(remaining(existing))} left, due ${dateLabel(existing.deadline)}.`));
  if (task) messages.push(say('assistant', `Breaking “${task.title}” into ${task.steps.length} steps.`, { card: cardFor(task) }));
  if (d.commitment) messages.push(say('assistant', `${d.commitment.title} · ${dateLabel(d.commitment.date, true)}, ${time(d.commitment.start)}–${time(d.commitment.end)}.`));
  if (!task && !d.commitment) return { draft: {}, messages: messages.length ? messages : [say('assistant', HELP, { chips: STARTERS })] };
  // Nothing is planned until the student agrees with what was understood.
  messages.push(say('assistant', task ? 'Does this look right?' : 'Shall I fit it in?', { chips: confirmChips(!!task) }));
  return { draft: { proposal: { task, commitment: d.commitment }, awaiting: 'confirm' }, messages };
}

const confirmChips = (task: boolean): Chip[] => task
  ? [{ label: 'Looks right', send: 'Looks right' }, { label: 'Edit steps', action: 'edit' }]
  : [{ label: 'Yes, fit it in', send: 'Yes' }, { label: 'Change the time', send: 'Change the time' }];
const YES = /^(yes|yep|yeah|ya|looks (right|good|fine)|correct|confirm|ok|okay|sure|go|do it|fine|perfect)\b/i;

/** The student edited the steps by hand: show the new breakdown and ask again. */
export function revise(state: AppState, draft: Draft, task: Task): Turn {
  return settle(state, { title: task.title, deadline: task.deadline, steps: task.steps, commitment: draft.proposal?.commitment });
}

function fresh(state: AppState, input: string): Draft {
  const noun = NOUNS.find(n => n.match.test(input));
  const range = readRange(input);
  const d: Draft = {};
  // A time range, or a commitment word without any task words, means an event.
  const eventIntent = !!range || (!!noun && !TASK_WORDS.test(input));
  if (eventIntent) {
    const event = { title: noun?.title ?? 'New commitment', kind: noun?.kind ?? 'fixed', dimension: noun?.dimension ?? 'errands', date: eventDay(input, state.now, range?.index) };
    if (event.date && range) d.commitment = makeCommitment(event, event.date, range.start, range.end);
    else d.event = event;
  }
  const words = input.split(/\s+/).filter(Boolean).length;
  if (TASK_WORDS.test(input) || (!eventIntent && words >= 2 && !CHATTER.test(input))) {
    d.title = cleanTitle(input);
    d.deadline = deadlineFrom(input, state.now);
    d.minutes = minutesFrom(input);
  }
  return d;
}

const looksNew = (input: string) =>
  TASK_WORDS.test(input) || (!!NOUNS.find(n => n.match.test(input)) && input.split(/\s+/).length > 2) || !!readRange(input);

/** One user message in, the assistant's reply out. Pure: the caller owns state. */
export function converse(state: AppState, draft: Draft, text: string): Turn {
  const input = text.trim();
  if (!input) return { draft, messages: [] };
  switch (draft.awaiting) {
    case 'confirm': {
      const { task, commitment } = draft.proposal ?? {};
      if (YES.test(input)) return { draft: {}, messages: [], ready: draft.proposal };
      // Corrections to what was understood: a new effort, a new deadline, a new time.
      const minutes = task && minutesFrom(input, true);
      if (task && minutes) return settle(state, { title: task.title, deadline: task.deadline, minutes, commitment });
      const deadline = task && deadlineFrom(input, state.now, true);
      if (task && deadline) return settle(state, { title: task.title, deadline, steps: task.steps, commitment });
      if (commitment && !task) {
        const range = readRange(input);
        const event = { title: commitment.title, kind: commitment.kind, dimension: commitment.dimension, date: commitment.date };
        if (range) return settle(state, { commitment: makeCommitment(event, event.date, range.start, range.end) });
        if (/time|change|no\b/i.test(input)) return { draft: { event, awaiting: 'time' }, messages: [say('assistant', `What time is ${event.title.toLowerCase()} instead?`, { chips: timeChips() })] };
      }
      break;
    }
    case 'deadline': {
      const deadline = deadlineFrom(input, state.now, true);
      if (deadline) return settle(state, { ...draft, deadline, awaiting: undefined });
      break;
    }
    case 'effort': {
      const minutes = minutesFrom(input, true);
      if (minutes) return settle(state, { ...draft, minutes, steps: undefined, awaiting: undefined });
      break;
    }
    case 'day': {
      const date = eventDay(input, state.now);
      if (date && draft.event) {
        const range = readRange(input);
        const event = { ...draft.event, date };
        return settle(state, range
          ? { ...draft, event: undefined, commitment: makeCommitment(event, date, range.start, range.end), awaiting: undefined }
          : { ...draft, event, awaiting: undefined });
      }
      break;
    }
    case 'time': {
      const range = readRange(input);
      if (range && draft.event?.date) {
        return settle(state, { ...draft, event: undefined, commitment: makeCommitment(draft.event, draft.event.date, range.start, range.end), awaiting: undefined });
      }
      break;
    }
  }
  // An answer we could not read: ask again, unless it is plainly a new request.
  if (draft.awaiting === 'confirm' && !looksNew(input)) {
    return { draft, messages: [say('assistant', 'Tell me what to change — how long it takes, or when it’s due. Or tap Looks right.', { chips: confirmChips(!!draft.proposal?.task) })] };
  }
  if (draft.awaiting && !looksNew(input)) {
    const again = nextQuestion(state, draft);
    return { draft, messages: [again?.message ?? say('assistant', HELP)] };
  }
  return settle(state, fresh(state, input));
}

/** What the assistant says once the planner has decided. The calendar does the showing. */
export function respond(state: AppState, outcome: Outcome): { message: Message; draft: Draft } {
  const { task, commitment } = outcome.request;
  const ways = (n: number) => (n === 2 ? 'two ways' : n === 3 ? 'three ways' : `${n} ways`);
  if (outcome.kind === 'fits') {
    const n = outcome.options.length;
    const view: Chip[] = [{ label: n > 1 ? 'Compare on calendar' : 'Preview on calendar', action: 'calendar' }];
    if (!task) return { draft: {}, message: say('assistant', `${commitment!.title} fits — nothing else is scheduled then.`, { chips: view }) };
    if (n > 1) return { draft: {}, message: say('assistant', `It fits without moving anything. I found ${ways(n)} to place it.`, { chips: view }) };
    const added = planChanges(state, outcome.plan).added;
    const days = [...new Set(added.map(b => b.date))].sort();
    const where = !days.length ? '' : days.length === 1 ? ` on ${dateLabel(days[0])}` : ` across ${dateLabel(days[0])} – ${dateLabel(days[days.length - 1])}`;
    return { draft: {}, message: say('assistant', `It fits without moving anything — ${added.length} study ${added.length === 1 ? 'block' : 'blocks'}${where}.`, { chips: view }) };
  }
  if (outcome.kind === 'options') {
    const cause = outcome.conflict?.task
      ? `${commitment!.title} lands on ${duration(outcome.conflict.displacedMinutes)} of ${outcome.conflict.task.title}.`
      : 'Your study time is already full, so something has to give.';
    return { draft: {}, message: say('assistant', `${cause} I found ${ways(outcome.options.length)} to rebalance.`, { chips: [{ label: 'Compare on calendar', action: 'calendar' }] }) };
  }
  if (outcome.kind === 'clash') {
    const c = commitment!;
    return {
      draft: { event: { title: c.title, kind: c.kind, dimension: c.dimension, date: c.date }, awaiting: 'time' },
      message: say('assistant', `${c.title} would overlap ${outcome.clash.title}, which can’t move. What time instead?`, { chips: timeChips() }),
    };
  }
  if (task) {
    return {
      draft: { title: task.title, deadline: task.deadline, awaiting: 'effort' },
      message: say('assistant', `Even after rebalancing, ${duration(outcome.shortfall)} of “${task.title}” has nowhere to go before ${dateLabel(task.deadline)}. Could it take less time?`, { chips: effortChips(task.title, remaining(task)) }),
    };
  }
  return { draft: {}, message: say('assistant', `${commitment!.title} doesn’t fit without dropping ${duration(outcome.shortfall)} of scheduled work. Try another time?`, { chips: timeChips() }) };
}
