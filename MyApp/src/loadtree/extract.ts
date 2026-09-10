import { Step, WEEK } from './model';
import { Draft } from './chat';

/**
 * Client half of the AI extraction.
 *
 * Both values are safe to ship: the anon key is a public client key, and the
 * Gemini key lives only in the Edge Function's secrets. When they are absent
 * this returns null instantly and the app falls back to its local conversation,
 * so the demo works with no network at all.
 */
const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const TIMEOUT_MS = 7000;

export const aiConfigured = () => BASE !== '' && ANON !== '';

interface RemoteDraft {
  title: string;
  deadline: string;
  steps: { title: string; minutes: number }[];
  needsMoreInfo: boolean;
  question: string;
}

/** Anything the server sends is still checked here before it can reach the planner. */
function toDraft(data: RemoteDraft, taskId: string): Draft | null {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) return null;
  const steps: Step[] = (Array.isArray(data.steps) ? data.steps : [])
    .map((s, i) => {
      const name = typeof s?.title === 'string' ? s.title.trim() : '';
      const minutes = Number(s?.minutes);
      if (!name || !Number.isInteger(minutes) || minutes < 15 || minutes > 480 || minutes % 15) return null;
      return { id: `${taskId}-s${i}`, title: name, estimate: minutes, remaining: minutes };
    })
    .filter((s): s is Step => s !== null);
  if (!steps.length) return null;

  const deadline = typeof data.deadline === 'string' && /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(data.deadline)
    ? data.deadline
    : undefined;
  return { title, deadline, steps };
}

export async function extractDraft(text: string, now: string): Promise<Draft | null> {
  if (!aiConfigured()) return null;
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE}/functions/v1/extract-task`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${ANON}`, apikey: ANON },
      signal: control.signal,
      body: JSON.stringify({ text, today: now.slice(0, 10), week: WEEK }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as RemoteDraft;
    if (data.needsMoreInfo && (!Array.isArray(data.steps) || !data.steps.length)) return null;
    return toDraft(data, `task-${Date.now()}`);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
