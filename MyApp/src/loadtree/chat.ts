import { AppState, Commitment, Step, Task, WEEK, addDays, dateLabel, duration, remaining, time } from './model';
import { NOUNS } from './conflict';
import { Outcome, Request } from './flow';
import { planChanges } from './planChanges';

export type Role = 'user' | 'assistant';
export interface Chip { label: string; send?: string; action?: 'calendar' | 'edit' }
/** A task broken into steps, shown as one compact card instead of a paragraph. */
export interface TaskCard { title: string; due: string; total: string; steps: { title: string; minutes: number }[] }
/** What was understood from a brain-dump, shown as editable items before anything is planned. */
export interface Review { task?: Task; commitment?: Commitment }
export interface Message { id: string; role: Role; text: string; at: string; chips?: Chip[]; card?: TaskCard; review?: Review }

/** Everything gathered so far. The optional AI extractor fills the same shape. */
export interface Draft {
  title?: string;
  deadline?: string;
  minutes?: number;
  steps?: Step[];
  commitment?: Commitment;
  event?: { title: string; kind: Commitment['kind']; dimension: Commitment['dimension']; date?: string };
  awaiting?: 'deadline' | 'effort' | 'day' | 'time' | 'confirm' | 'team' | 'stage' | 'scope';
  /** How big the student is aiming — drives LoadTree's own estimate for long projects. */
  scope?: 'simple' | 'prototype' | 'polished';
  /** The student set the hours on purpose (a correction), so LoadTree's estimate does not override them. */
  userSet?: boolean;
  /** For long projects: working alone or with others, and how far along it already is. */
  team?: 'solo' | 'team';
  stage?: 'fresh' | 'idea' | 'building';
  /** Built and shown, waiting for the student to say it looks right. */
  proposal?: Request;
  /** Subtasks the student unticked in the review; they are left out of the plan. */
  skip?: string[];
}
/** One exchange. `ready` means the planner has enough to act on. */
export interface Turn { messages: Message[]; draft: Draft; ready?: Request }

let counter = 0;
export const say = (role: Role, text: string, extra: Partial<Message> = {}): Message =>
  ({ id: `m${Date.now().toString(36)}${(counter++).toString(36)}`, role, text, at: new Date().toISOString(), ...extra });

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight';
const TASK_WORDS = /\b(assignment|report|essay|paper|thesis|dissertation|project|coursework|homework|revision|revise|revising|exam|midterm|quiz|test|presentation|slides|study|studying|reading|problem set|pset|write-?up|portfolio|hackathon|competition|contest)\b/i;
const CHATTER = /^(hi|hello|hey|yo|thanks|thank you|ok|okay|cool|nice|great|sure)\b[\s!.]*$/i;

const STARTERS: Chip[] = [
  // The demo: a long-term project, due in a fortnight, that needs a few questions before it can be planned.
  { label: 'Joining a hackathon, due in 2 weeks', send: 'I’m joining a hackathon and the submission is due in two weeks' },
];
const HELP = 'Tell me what’s coming up — for example “I’m joining a hackathon, due in two weeks” or “Work Friday 6pm to 10pm”.';

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
  // Up to 100 hours: long projects are measured in tens of hours, not minutes.
  const snap = (m: number) => Math.min(6000, Math.max(15, Math.round(m / 15) * 15));
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
  // Relative deadlines: "in two weeks", "after 10 days", "next week".
  const relative = /\b(?:in|after|within)\s+(a|one|two|three|four|\d+)\s+(week|day)s?\b/.exec(lower);
  if (relative) {
    const n = ({ a: 1, one: 1, two: 2, three: 3, four: 4 } as Record<string, number>)[relative[1]] ?? Number(relative[1]);
    return `${addDays(now.slice(0, 10), relative[2] === 'week' ? n * 7 : n)}T23:59`;
  }
  if (/\bnext week\b/.test(lower)) return `${addDays(now.slice(0, 10), 7)}T23:59`;
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
  if (/\bhackathon\b/i.test(input)) return 'Hackathon project';
  let t = ` ${input} `;
  const cut = t.search(/\b(?:due|by|before|deadline|until)\b|,\s*(?:about|around|roughly|probably|maybe)\b|\b(?:about|around|roughly|probably|maybe)\s+\d|\b\d+(?:\.\d+)?\s*(?:h|hrs?|hours?|mins?|minutes?)\b|\b(?:and|but)\s+(?:i\s+)?(?:have|got|also)\b|\b(?:(?:on|this|next)\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight)\b/i);
  if (cut > 0) t = t.slice(0, cut);
  t = t.replace(/^\s*(?:i\s+)?(?:really\s+)?(?:need|have|got|must|want|should)\s+to\s+/i, ' ')
    .replace(/^\s*(?:finish|complete|do|work on|start on|start|get)\s+/i, ' ')
    .replace(/^\s*(?:my|the|a|an|our)\s+/i, ' ')
    .replace(/[.,;:!?\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t ? `${t[0].toUpperCase()}${t.slice(1)}`.slice(0, 48) : 'New task';
}

/** Step name, relative weight, and whether it is optional scope. `long` marks multi-week projects. */
type Template = { match: RegExp; steps: [string, number, boolean?][]; typical: number; long?: boolean };
const TEMPLATES: Template[] = [
  {
    // 22h for a solo working prototype from scratch — before scope, team and progress adjust it.
    match: /hackathon|competition|contest/i, long: true, typical: 1320,
    steps: [['Understand the brief & rules', 5], ['Choose the problem & idea', 8], ['Plan features & design', 10], ['Build the core prototype', 40],
      ['Polish & test', 12, true], ['Make the pitch deck', 10], ['Record the demo video', 8, true], ['Final checks & submit', 4]],
  },
  { match: /database|sql|schema/i, steps: [['Research schema', 20], ['Build the database', 35], ['Write SQL queries', 30], ['Final review', 15]], typical: 180 },
  { match: /presentation|slides|pitch/i, steps: [['Research the topic', 30], ['Build the slides', 45], ['Rehearse', 25]], typical: 180 },
  { match: /\blab\b|experiment/i, steps: [['Read brief and requirements', 15], ['Research and gather information', 35], ['Write report', 35], ['Proofread and finalise', 15]], typical: 180 },
  { match: /revis|exam|midterm|quiz|\btest\b|study/i, steps: [['Review your notes', 30], ['Practice questions', 30], ['Timed past paper', 25], ['Final recap', 15]], typical: 240 },
  { match: /report|essay|paper|thesis|dissertation|write-?up/i, steps: [['Gather sources', 20], ['Outline the argument', 15], ['Write the draft', 45], ['Edit & submit', 20]], typical: 300 },
  { match: /reading|chapter/i, steps: [['Skim and plan', 20], ['Read closely', 60], ['Make notes', 20]], typical: 120 },
  { match: /project|assignment|coursework|homework|problem set|pset/i, steps: [['Plan the approach', 25], ['Do the main work', 55], ['Check & submit', 20]], typical: 180 },
];
const FALLBACK: Template = { match: /./, steps: [['Get started', 25], ['Main work', 55], ['Wrap up', 20]], typical: 120 };
const templateFor = (title: string) => TEMPLATES.find(t => t.match.test(title)) ?? FALLBACK;
const taskId = (state: AppState, title: string) => `task-${state.revision}-${title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)}`;

/** Splits the effort across the task's natural steps in 15-minute units, with nothing lost to rounding. */
/** Long projects adapt to the answers: skip what is already done, add coordination for a team. */
function profiledSteps(template: Template, profile: Pick<Draft, 'team' | 'stage'>): Template['steps'] {
  let steps = template.steps;
  if (!template.long) return steps;
  if (profile.stage === 'idea') steps = steps.filter(([name]) => !/problem & idea/.test(name));
  if (profile.stage === 'building') steps = steps.filter(([name]) => !/brief|problem & idea|Plan features/.test(name));
  if (profile.team === 'team') steps = [['Split roles with your team', 4], ...steps];
  return steps;
}

// Even a simple team demo that is already underway is real work (~12h+); a hackathon is never a small job.
const SCOPE: Record<NonNullable<Draft['scope']>, number> = { simple: 0.8, prototype: 1, polished: 1.36 };
const TEAM_SHARE = 0.9;

/**
 * LoadTree's own estimate — the point of the app, since students underestimate their workload.
 * Known kinds of work use their typical size; long projects scale with scope, team and progress.
 * Unknown work returns undefined, and only then is the student asked how long it takes.
 */
export function estimateFor(title: string, profile: Pick<Draft, 'team' | 'stage' | 'scope'> = {}): number | undefined {
  const template = templateFor(title);
  if (template === FALLBACK) return undefined;
  if (!template.long) return template.typical;
  const weight = (steps: Template['steps']) => steps.reduce((sum, [, w]) => sum + w, 0);
  const share = weight(profiledSteps(template, profile)) / weight(template.steps);
  const raw = template.typical * SCOPE[profile.scope ?? 'prototype'] * (profile.team === 'team' ? TEAM_SHARE : 1) * share;
  return Math.max(60, Math.round(raw / 15) * 15);
}

export function buildTask(state: AppState, title: string, deadline: string, minutes: number, profile: Pick<Draft, 'team' | 'stage'> = {}): Task {
  const steps = profiledSteps(templateFor(title), profile);
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
  return { id, title, deadline, demand: 'high', steps: chosen.map(([name, , optional], i) => ({ id: `${id}-s${i}`, title: name, estimate: alloc[i] * 15, remaining: alloc[i] * 15, ...(optional ? { optional: true } : {}) })) };
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
  const long = !!templateFor(title).long;
  const values = below
    ? (long ? [480, 600, 720, 900, 1200] : [30, 60, 90, 120, 180, 240, 300]).filter(v => v < below).slice(-3)
    // In the sample fortnight: 15h fits, 22h needs a trade-off, 30h is honestly too much.
    : long ? [900, 1320, 1800] : [...new Set([60, 120, templateFor(title).typical])].sort((a, b) => a - b);
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
    // Long projects need a little more context before they can be broken down well.
    const long = !!templateFor(d.title).long && !d.steps?.length;
    if (long && !d.team) return { awaiting: 'team', message: say('assistant', `Nice — due ${dateLabel(d.deadline)}. Are you doing it solo or with a team?`, { chips: [{ label: 'Solo', send: 'Solo' }, { label: 'With a team', send: 'With a team' }] }) };
    if (long && !d.stage) return { awaiting: 'stage', message: say('assistant', 'Where are you at right now?', { chips: [{ label: 'Starting from scratch', send: 'Starting from scratch' }, { label: 'I have an idea', send: 'I have an idea' }, { label: 'Already building', send: 'Already building' }] }) };
    if (long && !d.scope) return { awaiting: 'scope', message: say('assistant', 'How big is the build you’re aiming for?', { chips: [{ label: 'A simple demo', send: 'A simple demo' }, { label: 'A working prototype', send: 'A working prototype' }, { label: 'A polished full app', send: 'A polished full app' }] }) };
    // Only work LoadTree cannot size on its own needs the student's guess.
    if (!d.minutes && !d.steps?.length && estimateFor(d.title) === undefined) return { awaiting: 'effort', message: say('assistant', `Roughly how long will “${d.title}” take? A guess is fine.`, { chips: effortChips(d.title) }) };
  }
  return null;
}

/** Either asks the next question or hands a complete request to the planner. */
export function settle(state: AppState, d: Draft): Turn {
  const ask = nextQuestion(state, d);
  if (ask) return { draft: { ...d, awaiting: ask.awaiting }, messages: [ask.message] };

  const existing = d.title ? existingTask(state, d.title) : undefined;
  // LoadTree sizes the work itself. A guess well below its estimate is the underestimate the app exists to catch.
  const estimate = d.title && !d.steps?.length ? estimateFor(d.title, d) : undefined;
  const underestimated = !!(estimate && d.minutes && !d.userSet && d.minutes < estimate * 0.75);
  const minutes = estimate && (!d.minutes || underestimated) ? estimate : d.minutes;
  const task = d.title && !existing && d.deadline
    ? (d.steps?.length ? fromSteps(state, d.title, d.deadline, d.steps) : buildTask(state, d.title, d.deadline, minutes!, { team: d.team, stage: d.stage }))
    : undefined;
  const messages: Message[] = [];
  if (existing) messages.push(say('assistant', `${existing.title} is already on your calendar — ${duration(remaining(existing))} left, due ${dateLabel(existing.deadline)}.`));
  if (task && !d.steps?.length && minutes) {
    const days = Math.round((Date.parse(`${task.deadline.slice(0, 10)}T12:00:00Z`) - Date.parse(`${state.now.slice(0, 10)}T12:00:00Z`)) / 86400000);
    const perWeek = Math.round(minutes / Math.max(1, days / 7) / 15) * 15;
    if (underestimated) messages.push(say('assistant', `You said about ${duration(d.minutes!)}, but work like this usually takes nearer ${duration(minutes)} — so I’ve planned for that. You can adjust the steps.`));
    else if (estimate && !d.minutes) messages.push(say('assistant', days > 7
      ? `From what you’ve told me, I estimate about ${duration(minutes)} of work — roughly ${duration(perWeek)} a week until ${dateLabel(task.deadline)}.`
      : `I estimate about ${duration(minutes)} for this.`));
  }
  if (!task && !d.commitment) return { draft: {}, messages: messages.length ? messages : [say('assistant', HELP, { chips: STARTERS })] };
  // Everything understood becomes one set of editable items. Nothing is planned until the student agrees.
  const count = (task ? 1 : 0) + (d.commitment ? 1 : 0);
  messages.push(say('assistant', count > 1 ? `I’ve found ${count} items` : 'Here’s what I understood', { review: { task, commitment: d.commitment } }));
  return { draft: { proposal: { task, commitment: d.commitment }, awaiting: 'confirm', team: d.team, stage: d.stage, scope: d.scope }, messages };
}

/** A piece of a brain-dump that stands on its own: it names a task, a commitment, or a time. */
const standalone = (s: string) => TASK_WORDS.test(s) || NOUNS.some(n => n.match.test(s)) || !!readRange(s);

/**
 * Splits a brain-dump like "Lab report Friday about 3 hours, and work Friday 6–10pm" into its items.
 * Fragments that cannot stand alone ("probably 3 hours") stay with the item before them.
 */
export function readItems(state: AppState, input: string): Draft {
  const segments: string[] = [];
  for (const part of input.split(/\s*(?:;|,?\s+and\s+|,)\s*/i).filter(Boolean)) {
    if (segments.length && !standalone(part)) segments[segments.length - 1] += ` ${part}`;
    else segments.push(part);
  }
  if (segments.length < 2) return fresh(state, input);
  const drafts = segments.map(s => fresh(state, s));
  const task = drafts.find(d => d.title);
  const event = drafts.find(d => d.commitment || d.event);
  if (!task && !event) return fresh(state, input);
  return {
    ...(task ? { title: task.title, deadline: task.deadline, minutes: task.minutes } : {}),
    ...(event?.commitment ? { commitment: event.commitment } : event?.event ? { event: event.event } : {}),
  };
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
    // "Lab report Friday" means due Friday — unless the day belongs to a time range ("work Friday 6–10pm").
    d.deadline = deadlineFrom(input, state.now) ?? (range ? undefined : deadlineFrom(input, state.now, true));
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
      if (YES.test(input)) {
        // Unticked subtasks are left out; a task with nothing left is dropped.
        const kept = task && { ...task, steps: task.steps.filter(s => !draft.skip?.includes(s.id)) };
        return { draft: {}, messages: [], ready: { task: kept && kept.steps.length ? kept : undefined, commitment } };
      }
      // Something that names a new item ("work Friday 6–10pm") is an addition, not a correction.
      if (standalone(input)) break;
      // Corrections to what was understood: a new effort, a new deadline, a new time.
      const minutes = task && minutesFrom(input, true);
      // A correction is the student's call: their number stands.
      if (task && minutes) return settle(state, { title: task.title, deadline: task.deadline, minutes, commitment, team: draft.team, stage: draft.stage, scope: draft.scope, userSet: true });
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
    case 'team': {
      const team = /\b(team|group|friends|together|with|of us)\b/i.test(input) ? 'team' : /\b(solo|alone|myself|just me|on my own)\b/i.test(input) ? 'solo' : undefined;
      if (team) return settle(state, { ...draft, team, awaiting: undefined });
      break;
    }
    case 'stage': {
      const stage = /\b(build|building|started|halfway|progress|prototype)\b/i.test(input) ? 'building' : /\bidea\b/i.test(input) ? 'idea' : /\b(scratch|nothing|not started|fresh|zero)\b/i.test(input) ? 'fresh' : undefined;
      if (stage) return settle(state, { ...draft, stage, awaiting: undefined });
      break;
    }
    case 'scope': {
      const scope = /\b(polish|polished|full|complete|ambitious|production)\b/i.test(input) ? 'polished' : /\b(simple|basic|small|mvp|demo)\b/i.test(input) ? 'simple' : /\b(prototype|working|standard|normal)\b/i.test(input) ? 'prototype' : undefined;
      if (scope) return settle(state, { ...draft, scope, awaiting: undefined });
      break;
    }
    case 'deadline': {
      const deadline = deadlineFrom(input, state.now, true);
      if (deadline) return settle(state, { ...draft, deadline, awaiting: undefined });
      break;
    }
    case 'effort': {
      const minutes = minutesFrom(input, true);
      if (minutes) return settle(state, { ...draft, minutes, steps: undefined, awaiting: undefined, userSet: true });
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
  const next = readItems(state, input);
  // "Add more items": new things join what is already under review instead of replacing it.
  if (draft.awaiting === 'confirm' && draft.proposal) {
    const { task, commitment } = draft.proposal;
    const keepTask = task && !next.title ? { title: task.title, deadline: task.deadline, steps: task.steps } : {};
    const keepEvent = commitment && !next.commitment && !next.event ? { commitment } : {};
    return settle(state, { ...keepTask, ...keepEvent, ...next });
  }
  return settle(state, next);
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
