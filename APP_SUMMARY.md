# Beating the Burnout — App Summary & Iteration Log

## 1. The pitch (lead with this, not the feature list)
Burnout doesn't happen because of one big thing — it happens quietly, across everything at once, and by the time a student notices, it's too late. This app is an early-warning system for that: it watches a student's whole life load — not just their to-do list — tells them days before they're going to crash instead of the day of, and, when things get bad enough, can quietly let someone who cares about them know, with the student always in control. It's the difference between a to-do list and something that actually has your back.

## 1a. One-liner (for quick intros)
An early-warning system for student burnout that notices what a student can't, projects it forward, and — uniquely — helps the people around them notice too, with full user control.

## 1b. The three "wow" features (lead your demo with these, not the calendar screen)
1. **Trusted contact, opt-in once, minimal-signal only** — during onboarding, a student can optionally add one trusted person. That person never sees tasks, schedule, or scores — only an occasional, rate-limited nudge like "might be a good time to check in with them," and only after sustained overload. No repeated prompts, no guilt-tripping, fully opt-out any time.
2. **Forward-looking projection, not just today's number** — using tasks already on the calendar, the app projects load days ahead ("on track to hit 🔴 by Wednesday based on what's already scheduled"), rather than only reporting the current day.
3. **Pattern insights over time** — using the student's own logged history (sleep/mood check-ins vs. past overload events), the app can surface a plain-language pattern ("your last two rough weeks both followed a few nights of poor sleep").

## 2. Differentiation (why not just Notion/Motion/Sunsama?)
Those tools optimize your *calendar and tasks*. We look at a student's *whole life load* — mental, time, physical, social, and errands — not just the to-do list, and instead of just showing a busy schedule, we predict burnout before it hits and actively help the student recover, not just reschedule.

## 3. The problem, restated in our own words
Burnout for students rarely comes from one big thing — it's small loads across different parts of life (coursework, part-time work, social life, physical health, errands) piling up quietly until it's too late. Students don't have visibility into how much they're actually carrying, so they keep saying yes to things and defer the "less urgent" parts of their wellbeing (sleep, rest, seeing people) until they crash.

## 4. The five load categories
| Category | What it captures | How it's measured |
|---|---|---|
| **Time** | Hours committed vs. capacity | Auto-calculated from tasks/calendar |
| **Mental** | Cognitive/emotional strain (hard assignments, exams, ambiguity) | Task difficulty tag + self-reported check-in |
| **Physical** | Body fatigue (sleep, movement, being run down) | Daily check-in (sleep quality) + optional health app integration (stretch goal) |
| **Social** | Both over-socializing AND isolation | Self-reported weekly check-in only (deliberately not inferred — see iteration log) |
| **Errands** | Life admin (chores, appointments, shifts) | Task category tag, entered same as any task |

## 5a. Load-score formula (finalized, with real numbers)

**Time Load (per day)**
```
TimeLoad% = (Σ task hours placed that day, urgency-weighted) / DailyCapacity × 100, capped at 100
```
Task hours come directly from the user-entered duration (or, for multi-milestone tasks, the sum of milestone durations placed on that day via the auto-placement algorithm in section 5). Urgency weighting: due today ×1.5, due in 1-2 days ×1.2, due 3+ days ×1.0. Default `DailyCapacity = 6h` (adjustable).

**Mental Load (per day)**
```
MentalLoad% = 0.5 × (hours-weighted avg task difficulty × 20) + 0.5 × (3-day rolling mood check-in avg)
```
Task difficulty tagged 1-5 by the user on add. Mood check-in: 🟢=20%, 🟡=60%, 🔴=100%.

**Physical Load (per day)**
```
PhysicalLoad% = 3-day rolling average of sleep quality check-in
```
Sleep check-in: good=20%, okay=50%, poor=90%.

**Social Load (per week)**
```
SocialLoad% = weekly self-report only (🟢 balanced=20% / 🟡 a bit off=60% / 🔴 isolated or overwhelmed=100%)
```
Deliberately self-report only — no calendar/task inference. See iteration log for why.

**Errands Load (per day)**
```
ErrandsLoad% = (pending/overdue errand tasks / 3) × 100, capped at 100
```

**Overall Capacity Score**
```
OverallLoad% = 0.30×Time + 0.30×Mental + 0.20×Physical + 0.10×Social + 0.10×Errands
```
Weights reflect Time/Mental as the most direct/immediate drivers of student burnout, Physical next (sleep debt compounds fast), Social/Errands lower (slower-building background stressors).

Thresholds: 🟢 0-60% fine · 🟡 61-85% heavy · 🔴 86%+ overloaded.

**Personalization over time**: weekly, compare predicted load vs. self-reported weekly feeling. If actual felt worse than predicted, nudge up the weight of that week's highest-contributing category by ~2% (renormalize to 100%); if better, nudge down. Simple, bounded, fully explainable — this is the "AI learns you" mechanism, not a black-box model.

**Worked example (Alex, Thursday)**: 5h coursework due tomorrow (urgency ×1.5 = 7.5 effective hrs, difficulty 4/5), 3-day mood avg 🟡🟡🔴 (73%), 3-day sleep avg poor/okay/poor (76%), this week's social self-report 🟡 (60%), 2 pending errands (67%).
```
TimeLoad = 100 (capped) | MentalLoad = 76.5 | PhysicalLoad = 76 | SocialLoad = 60 | ErrandsLoad = 67
Overall = 0.30(100) + 0.30(76.5) + 0.20(76) + 0.10(60) + 0.10(67) = 30 + 22.95 + 15.2 + 6 + 6.7 = 80.85% → 🟡 Heavy
```

## 5. Core user flow (complete, simple version)

1. **Onboarding** (once): create profile → set default daily capacity (~6h, adjustable) → set rough time-map windows (e.g. "Study: 2pm-10pm," "Personal: 10pm-12am") → manually enter recurring fixed commitments (classes/shifts — no calendar import, deliberate, see iteration log) → pick 2-3 preferred recovery activities + "add your own" custom option.

2. **Add a task**: enter name, due date (or target finish date if earlier than due date), **duration in hours (integer, user-entered directly)**, category tag, priority, fixed or flexible. Optional: type/speak it naturally instead ("Database assignment, due 8/19, 3 hours") — AI parses this into the structured fields automatically, manual form is always available as a fallback. Optional "+ Add milestone" for multi-stage work: each milestone is its own lightweight task (name, due date, duration in hours) linked to the parent. **Milestone durations must sum to the parent task's total duration** — the UI shows a running total as milestones are added (e.g., "3h of 6h assigned") and warns (not hard-blocks) if under/over. Fixed/flexible is not inherited by milestones — fixed is reserved for real external commitments (classes, shifts, exams), which are entered as-is and never milestoned; self-directed work (assignments, projects) is flexible by nature.

2a. **Auto-placement algorithm (how the app picks the day/time — the user does not manually schedule)**: given a task's due date and duration (or a milestone's own due date and duration):
   - Scan every day between now and the due date.
   - For each day, compute current load (already-placed tasks) against remaining capacity.
   - Rank days by available room; prefer earlier days over later ones when the task is high-priority/high-difficulty, so demanding work isn't crammed right before the deadline.
   - Only place within the user's declared time-map windows (e.g., a "Deep Study" task only goes inside the "Study: 2pm-10pm" window).
   - Place the block; if the task has multiple milestones or needs chunking, repeat per piece, checking each day's load *after* prior placements that day so nothing double-stacks onto an already-heavy day.
   - The user can always override the automatic placement by dragging a block to a different day/time on the calendar — automatic by default, manual adjustment always available.

3. **Auto-distribution**: engine spreads the task's effort across available days before the deadline — respecting the user's time-map windows, existing load per day, mandatory buffer gaps between blocks (10-15 min), and chunking constraints. Task appears on the calendar already sensibly scheduled, not just dumped on the due date.

4. **Overload check on add**: recomputes projected load (all 5 categories) for affected days. If threshold crossed, offers top **2-3 reschedule options** (move a specific lower-priority flexible task to a specific real open slot) — same engine as distribution, rule-based, phrased naturally via LLM. Approve moves it; reject logs it and offers a recovery suggestion instead.

5. **Daily check-in**: a small inline widget (not a full page) — tap "Check in," two quick rows of taps (mood, sleep) appear right there, dismiss when done. Every few days, also a quick social-connection tap. This is the "ground truth" layer catching what the calendar can't see.

6. **Completion check-ins**: at the end of a scheduled task block, a quick prompt — done / need more time / reschedule. Feeds actual-vs-estimated data back into the engine (and into personalization over time).

7. **Destress button** (always visible, not a page): tap opens a small popover — "mentally or physically drained, or both?" — then expands in place to show 2-3 relevant suggestion cards (reschedule-leaning for mental, recovery-activity-leaning for physical, from saved preferences + a real open slot), dismissible by tapping outside.

8. **Weekly reflection**: "How did this week feel?" 🟢🟡🔴 — tunes the load-score weights per user over time (the explainable personalization mechanism).

9. **Recurring routines** (set once in onboarding or added like any task): sleep, exercise, meals — auto-reserved around dynamic work tasks, protected the same way a fixed task would be, and pulled into recovery suggestions when relevant.

10. **Trusted contact (optional, opt-in once)**: if sustained 🔴 overload with no acted-on suggestions, a rate-limited, low-detail nudge goes to the one trusted person the student chose — no schedule or task detail, just a signal to check in.

## 5b. Screens (what actually needs to be built)
- **Calendar/timetable view** (core, not just "today") — an hour-grid timetable (not a flat list), showing tasks as time-blocked cards positioned by their actual scheduled start time and duration, so auto-placement and reschedule moves are visibly happening. Blocks are draggable — resize to adjust duration, move to a different day/time to manually override the algorithm.
- **Today view** — capacity gauge (overall + 5-category breakdown), forward-projection banner, today's timetable.
- **Add task** — manual form (name, due date, duration in hours, category, fixed/flexible) + optional natural-language entry (AI-parsed), milestone "+" for multi-stage work with running duration total.
- **Overload check** — before/after % impact, 2-3 reschedule options, accept/reject.
- **Check-in widget** — inline, not a separate page.
- **Destress button + popover** — tap opens a small anchored dropdown (mentally / physically / both drained); selecting one swaps the same popover's content to show 2-3 tailored suggestions, with a back option — no separate page, no lost context.
- **Onboarding** — capacity, time maps, fixed commitments (entered manually, no calendar import — see iteration log), recovery preferences, optional trusted contact.
- A rough interactive prototype exists (HTML/JS, mock data, no backend) demonstrating these screens and interactions for demo/mentor purposes — not the production codebase.

## 6. The overload-detection logic (explainable, not black-box)
- A weighted composite score per day/week, inspired by the structure of NASA-TLX (workload index) and the Maslach Burnout Inventory (clinical burnout framework) — not copied directly, but used as a grounded structure for combining sub-scores.
- `Load Score = w1(task hours / capacity) + w2(deadline urgency) + w3(recent mood check-in trend) + w4(social load) + w5(errand load)`
- Weights start roughly equal and shift slightly based on the user's own weekly 🟢🟡🔴 feedback — this is how the app "learns" the individual, in a way we can explain step by step if asked.
- Reschedule suggestions are chosen with clear rules: only *flexible* tasks are candidates, ranked by lowest urgency/priority, moved only into a slot that keeps *both* the original and target day under threshold. If no valid slot exists, the app falls back to a recovery suggestion instead of forcing a bad move.

## 7. Privacy stance (deliberate, not an oversight)
We chose self-reported check-ins over deeper surveillance (e.g., reading messages to detect social plans, tracking app/screen usage) even though it would reduce missed data. This was a conscious trade-off — respecting student agency and privacy over squeezing out marginal accuracy. Health app integration (sleep/steps) is an opt-in stretch feature, not a requirement.

## 8. Tech stack decision
- **React Native via Expo, targeting Android.** Chosen because the team has React (not React Native) experience — Expo removes native build tooling friction and allows live device testing via Expo Go, minimizing risk given the team's actual skillset. Hackathon rules require a working mobile app, so a web app was ruled out.
- LLM API used for: (a) optional NLP task extraction from natural language input, (b) turning rule-based suggestions into natural, friendly phrasing. The LLM does **not** make the reschedule/recovery decisions itself — that logic is deterministic and explainable, to keep the AI's role transparent and the demo reliable.

## 9. Scope tiers
**Core (must work for demo):**
- Manual task add with category/priority/fixed-flexible tagging, optional milestone breakdown
- Calendar/week view with load-score display (not just a single-day view)
- Overload detection on task-add with top-2/3 reschedule suggestions
- Daily check-in widget (inline, mood + sleep)
- Destress button + popover with mental/physical/both routing and recovery suggestions

**Stretch (build if time allows):**
- NLP natural-language task entry (voice/text) — visible AI touchpoint, worth prioritizing over other stretch items since it's a real, demoable AI feature
- Health app (sleep/steps) integration
- Persistent notification/widget for check-in outside the app

**Deliberately excluded (mention as a considered-and-rejected idea):**
- App usage/screen time tracking — rejected on privacy/trust grounds, not technical difficulty.
- Fully autonomous "agentic" AI that reschedules without approval — rejected in favor of "AI-recommended, user-approved" to preserve user control and demo reliability.

---

## 10. Iteration log — ideas explored, dead ends, and why we moved past them

| Idea explored | Why it was tempting | Why we moved away from it |
|---|---|---|
| Just a workload visualizer showing % capacity | Simple, clear MVP | Rubric/problem statement explicitly says "don't just track and report" — needed to *act*, not just display |
| "Just Google Calendar + AI determines if you're stressed" | Fast to build, low complexity | Only captures the *time* dimension of load, ignores mental/physical/social/errands entirely; "AI determines" is unexplainable in Q&A — reverted to the fuller multi-category design |
| Full 15-second daily survey across all 5 categories | Ensures rich data in every category | Risk of input fatigue killing daily engagement; redesigned so most categories are inferred from normal use (task tags, calendar), leaving only a single mood+sleep tap as active input |
| Merge all categories into one "you're overloaded" blob score | Simpler to build and display | Loses actionable specificity — generic "you're stressed, take a break" is indistinguishable from any wellness app; kept categories separate so nudges can be targeted (e.g. physical vs mental) |
| Infer missed social events by reading messages/other app data | Would improve data completeness | Crosses from "data completeness problem" into a genuine privacy issue; decided self-report (mood check-in) is the acceptable correction layer instead |
| Track app usage/screen time to verify the user is "really" resting | Extra data signal, sounds sophisticated | High technical friction (OS-level permission gates) and ethically closer to surveillance than care, especially for a privacy-conscious student audience — deliberately excluded, mentioned in pitch as a considered-and-rejected idea |
| Fully agentic AI that reschedules tasks autonomously | Sounds impressive, "cutting edge" | Demo-reliability risk (unpredictable live behavior) and removes user control, which felt wrong for a wellness product — redesigned as rule-based logic + user approval instead |
| Free-text "any activity you like" during a live overload moment | Feels flexible/personal | Breaks structured slot-matching logic and adds live-parsing risk during demo — moved custom activities to onboarding instead, where they become a structured saved preference |
| Recovery suggestions treated as one generic category | Simple single suggestion type | Splitting into mental vs. physical (via the Destress button's quick routing question) reuses the load-category system already built and makes suggestions feel meaningfully more relevant |
| Social Load calculated from logged hangout hours (like time load) | Reuses the same hours-based math as Time Load, feels consistent | Users won't log social hangouts as tasks in a workload app — the signal would almost always read near-zero regardless of actual social life. Same "user won't log it" problem as tasks, but worse. |
| Considered dropping Social Load entirely, folding it into Mental | Simpler to build, avoids the measurement problem above | Would weaken the category-specific recovery suggestions (isolation needs a different fix than mental fatigue) and diverges from the brief's five named categories, which is directly scored under Impact |
| Social Load via a "was this social too?" toggle on regular tasks | Cheap, reuses existing task-add flow, avoids needing a separate hangout log | Still assumes meaningful logging behavior most users won't do — even a one-tap toggle depends on the user framing a hangout as a "task" in the first place, which most won't |
| **Final: Social Load = self-report only, once a week** | — | Consistent with how real burnout research measures subjective/social state (e.g. Maslach Burnout Inventory uses self-report, not passive tracking) — and avoids the privacy trade-offs of inferring social life from other data sources |
| Calendar bi-directional sync (import + write-back) | Would reduce manual entry of fixed commitments | Removed deliberately — OAuth/write-back complexity is a large build cost for the time available; fixed commitments are instead entered once manually during onboarding |
| Milestones as a separate sub-system from tasks | Seemed like it needed its own scheduling logic | Realized a milestone is just a task with a parent link and its own size tag — reuses the exact same distribution/scheduling engine, no new system needed |
| Fixed/flexible inherited from parent task down to milestones | Seemed logically consistent | Unnecessary — fixed is reserved for external commitments (classes/shifts) which are never milestoned; self-directed milestoned work is flexible by nature, so no inheritance logic needed |
| Daily check-in and Destress as full dedicated screens | Matches a typical multi-screen app structure | Adds unnecessary navigation friction for very frequent, low-effort actions — converted both to inline widgets/popovers so they're accessible without leaving the current screen |
| Effort size tiers (Quick/Medium/Long/Major) instead of raw hours | Avoids asking users to guess exact durations, which felt error-prone | Reversed back to direct integer-hour entry for clarity and simplicity of the scheduling math — accepted the trade-off that users estimate a number, since drag-to-resize on the timetable gives a fast way to correct it after the fact regardless of how the estimate was first entered |
| Destress as a full page, then as side-by-side buttons | Simpler to build than a stateful popover | Settled on a single anchored dropdown that swaps its own content (menu → results) in place — keeps context on the calendar underneath and avoids a jarring page change for something used in a stressed moment |

## 11. Open items still to finalize
- Real numeric weights for the load-score formula (next step)
- Actual screen-by-screen wireframe/flow diagram
- Team role split for build days
- Rehearsed demo script/narrative (proposed: "Meet Alex" — a student whose calendar looks fine but who's quietly burning out from poor sleep, showing why multi-category tracking catches what pure task-tracking misses)
- Cold-start approach: start with a standard default capacity assumption (~6h/day), calibrate slightly from the user's own early check-in responses