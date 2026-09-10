// Supabase Edge Function — turns a student's sentence into a typed task draft.
//
// The Gemini key lives here as a secret and never reaches the app bundle.
// This function ONLY extracts structure. It never schedules anything: the
// deterministic planner in the app decides what actually lands on a calendar.
//
// Deploy:
//   supabase secrets set GEMINI_API_KEY=...
//   supabase functions deploy extract-task
//
// Deno runtime — the `Deno` global and remote imports are provided by Supabase,
// so TypeScript errors from the app's tsconfig do not apply to this file.

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short task name, no due-date words' },
    deadlineDate: { type: 'string', description: 'YYYY-MM-DD, or empty if not stated' },
    deadlineTime: { type: 'string', description: 'HH:MM 24h, or empty' },
    steps: {
      type: 'array',
      description: '2 to 5 ordered steps a student can actually start',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          minutes: { type: 'integer', description: 'Multiple of 15, between 15 and 480' },
        },
        required: ['title', 'minutes'],
      },
    },
    needsMoreInfo: { type: 'boolean', description: 'true when the deadline or effort is genuinely unclear' },
    question: { type: 'string', description: 'One short question to ask, or empty' },
  },
  required: ['title', 'steps', 'needsMoreInfo'],
};

const PROMPT = `You turn a university student's message into a task roadmap.

Rules:
- Split the work into 2-5 concrete steps in the order they would be done.
- Every step's minutes must be a multiple of 15, between 15 and 480.
- Estimate honestly. Do not pad. Total should match a realistic effort for the task.
- Extract a deadline only if the student stated one. Never invent a date.
- Set needsMoreInfo true and supply one short question when the deadline or the
  effort is genuinely unclear.
- Never mention scheduling, calendars or times of day. You do not schedule; you
  only describe the work.`;

// The model's output is untrusted input. Clamp everything to what the app accepts.
function sanitise(raw: unknown, weekDates: string[]) {
  const data = (raw ?? {}) as Record<string, unknown>;
  const title = String(data.title ?? '').trim().slice(0, 120);
  if (!title) return null;

  const stepsIn = Array.isArray(data.steps) ? data.steps.slice(0, 5) : [];
  const steps = stepsIn
    .map((s) => {
      const step = (s ?? {}) as Record<string, unknown>;
      const name = String(step.title ?? '').trim().slice(0, 90);
      const mins = Number(step.minutes);
      if (!name || !Number.isFinite(mins)) return null;
      return { title: name, minutes: Math.min(480, Math.max(15, Math.round(mins / 15) * 15)) };
    })
    .filter(Boolean);

  const date = String(data.deadlineDate ?? '').trim();
  const time = String(data.deadlineTime ?? '').trim();
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`));
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  // Keep the demo honest: only accept dates inside the week the app knows about.
  const inWeek = validDate && weekDates.length ? weekDates.includes(date) : validDate;

  return {
    title,
    deadline: inWeek ? `${date}T${validTime ? time : '12:00'}` : '',
    steps,
    needsMoreInfo: Boolean(data.needsMoreInfo) || steps.length === 0,
    question: String(data.question ?? '').trim().slice(0, 160),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return Response.json({ error: 'not_configured' }, { status: 503, headers: CORS });

  let body: { text?: string; today?: string; week?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400, headers: CORS });
  }

  const text = String(body.text ?? '').trim().slice(0, 600);
  if (!text) return Response.json({ error: 'bad_request' }, { status: 400, headers: CORS });
  const week = Array.isArray(body.week) ? body.week.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 14) : [];

  const control = new AbortController();
  const timeout = setTimeout(() => control.abort(), 9000);
  try {
    const response = await fetch(`${ENDPOINT}?key=${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: control.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{
          role: 'user',
          parts: [{ text: `Today is ${body.today ?? 'unknown'}. The planning week is ${week.join(', ') || 'unknown'}.\n\nStudent said: ${text}` }],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 700,
        },
      }),
    });

    if (!response.ok) {
      return Response.json({ error: 'upstream', status: response.status }, { status: 502, headers: CORS });
    }
    const payload = await response.json();
    const jsonText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) return Response.json({ error: 'empty' }, { status: 502, headers: CORS });

    const draft = sanitise(JSON.parse(jsonText), week);
    if (!draft) return Response.json({ error: 'unusable' }, { status: 502, headers: CORS });
    return Response.json(draft, { headers: CORS });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return Response.json({ error: aborted ? 'timeout' : 'failed' }, { status: 504, headers: CORS });
  } finally {
    clearTimeout(timeout);
  }
});
