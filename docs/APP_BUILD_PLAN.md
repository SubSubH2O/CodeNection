# Beating the Burnout: App Build Plan

## 1. Problem Definition

### Problem Statement

Students balance academic work, part-time jobs, social commitments, personal errands, and physical or mental upkeep. These commitments are split across calendars, task lists, messages, and memory, so students cannot accurately see their total present or upcoming load.

Overload is commonly noticed only after deadlines, poor sleep, cognitive strain, or exhaustion have accumulated. Existing planners organise tasks and time, but do not combine wider life load, forecast overload, and propose a practical adjustment before burnout risk rises.

### Root Causes

| Root cause | Effect |
| --- | --- |
| Workload crosses academic, work, social, errand, and wellbeing domains. | Total life load is fragmented. |
| Tasks and commitments are spread across tools and messages. | No reliable view of all commitments. |
| Calendar time alone does not represent task difficulty or physical state. | Effort and capacity are misjudged. |
| Recovery and lower-urgency tasks are postponed first. | Workload continues accumulating. |
| Planning tools show current commitments but do not intervene. | Overload remains undetected until late. |

### Core Problem

Students cannot clearly perceive and act on their combined future workload before it becomes harmful.

### Target User

University or college students who manage coursework alongside at least one additional responsibility, such as part-time work, family duties, social commitments, or recurring personal errands.

### User Needs

| User need | App response |
| --- | --- |
| Understand total life load. | Show time, mental, physical, social, and errand load together. |
| Detect risky future days. | Project load from scheduled work and check-ins. |
| Receive an actionable response. | Offer user-approved reschedule or recovery suggestions. |
| Keep control of personal information. | Use self-reported wellbeing inputs and explainable rules. |
| Correct a schedule quickly. | Support direct calendar changes and short inline check-ins. |

### Product Boundaries

- Not a clinical diagnosis, therapy, or emergency service.
- No message reading, screen-time tracking, or passive social surveillance.
- The app recommends actions; the student approves every schedule change.
- Health-platform integration is a stretch feature, not an MVP dependency.

## 2. Solution Positioning

### Value Proposition

Beating the Burnout is an early-warning system for student burnout. It combines whole-life workload, forecasts overload days ahead, and gives students user-controlled actions to rebalance work or recover.

### Differentiation

| Typical planner | Beating the Burnout |
| --- | --- |
| Organises tasks and calendar time. | Assesses five load dimensions: time, mental, physical, social, and errands. |
| Shows current commitments. | Predicts future overload from existing scheduled work. |
| Leaves prioritisation decisions to the student. | Proposes specific feasible reschedule or recovery actions. |
| May automate changes without context. | Keeps suggestions deterministic, explainable, and user-approved. |

### Standout Features

1. Forward-looking load projection: shows when a future day is likely to become overloaded.
2. User-approved overload intervention: suggests concrete task moves that preserve capacity.
3. Pattern insights: relates past poor sleep or mood check-ins to recurring overload patterns.
4. Optional trusted-contact nudge: sends only a minimal, rate-limited check-in signal after sustained overload.

### Success Statement

When a student adds work that pushes a future day beyond capacity, the app shows the projected load, explains its contributors, and offers two or three feasible actions.

## 3. Core User Flow

| Step | User action | App behaviour |
| --- | --- | --- |
| 1. Onboarding | Sets daily capacity, time windows, fixed commitments, recovery preferences, and optional trusted contact. | Saves planning constraints and recovery options. |
| 2. Add task | Enters task name, due date, duration, category, priority, difficulty, and fixed/flexible type. | Validates fields and creates a task. |
| 3. Auto-schedule | Confirms task creation. | Finds available time before the due date, applies buffers, and creates scheduled blocks. |
| 4. Forecast | Views timetable and load. | Calculates daily five-category scores and projected overall load. |
| 5. Intervention | Adds work that crosses a threshold. | Shows before/after impact and two or three valid reschedule options. |
| 6. Decision | Accepts or rejects a suggestion. | Updates schedule and scores, or shows a recovery suggestion. |
| 7. Daily check-in | Selects mood and sleep state. | Updates mental and physical load trends. |
| 8. Destress action | Selects mental, physical, or both. | Shows tailored recovery or rescheduling suggestions without leaving the current screen. |
| 9. Weekly reflection | Rates the week as green, yellow, or red. | Applies small bounded adjustments to load weights. |

### Main Navigation

- Today: current load, forward-warning banner, today’s timetable, check-in entry point.
- Calendar: week timetable, scheduled blocks, manual drag and resize controls.
- Add Task: structured form and optional future natural-language entry.
- Profile: capacity, time windows, commitments, recovery preferences, privacy settings.

## 4. Feature Scope

### MVP

| Feature | Required behaviour |
| --- | --- |
| Onboarding | Capture capacity, availability windows, fixed commitments, and recovery preferences. |
| Task management | Add, edit, delete, categorise, prioritise, and classify tasks as fixed or flexible. |
| Milestones | Link lightweight milestones to a parent task and show duration-total warnings. |
| Auto-scheduling | Distribute flexible work into valid available slots before its due date. |
| Week timetable | Show scheduled blocks by start time and duration; allow manual move and resize. |
| Load scoring | Calculate five load dimensions, overall score, and green/yellow/red status. |
| Overload intervention | Offer two or three valid user-approved reschedule options. |
| Check-ins | Capture daily mood and sleep, plus periodic social status. |
| Destress popover | Route mental/physical/both selection to suitable recovery suggestions. |

### Stretch Features

- Natural-language or voice task entry parsed into structured fields.
- Pattern-insight history.
- Optional health-platform sleep and step data.
- Persistent notifications or Android widget.
- Trusted-contact alerting.

### Excluded Features

- Calendar import and write-back sync.
- Screen-time or app-usage monitoring.
- Message or social-data analysis.
- Autonomous rescheduling without explicit user approval.

## 5. Technical Plan

### Platform and Stack

| Layer | Decision | Reason |
| --- | --- | --- |
| Platform | Android-first mobile app | Matches the required working mobile-app format. |
| Framework | React Native with Expo | Reuses the team’s React knowledge and reduces native setup risk. |
| Language | TypeScript | Provides safer task, schedule, and score data contracts. |
| Navigation | Expo Router or React Navigation | Supports tab navigation and modal/popover flows. |
| Local state | Zustand or React Context | Keeps UI state simple for the prototype. |
| Persistence | AsyncStorage | Retains onboarding, tasks, schedule, and check-ins without a backend. |
| Backend | None for MVP | Keeps the demo reliable and reduces implementation risk. |
| LLM API | Optional stretch feature only | Parses natural-language tasks and phrases deterministic suggestions. |

### Core Data Model

| Entity | Essential fields |
| --- | --- |
| UserProfile | dailyCapacity, timezone, preferredRecoveryActivities |
| AvailabilityWindow | dayOfWeek, startTime, endTime, activityType |
| FixedCommitment | title, startTime, endTime, recurrence |
| Task | id, title, dueDate, durationHours, category, difficulty, priority, flexibility, status |
| Milestone | id, parentTaskId, title, dueDate, durationHours |
| ScheduledBlock | id, taskId, startTime, endTime, source, manualOverride |
| DailyCheckIn | date, mood, sleepQuality |
| WeeklyReflection | weekStart, perceivedLoad |
| LoadScore | date, time, mental, physical, social, errands, overall, status |
| RescheduleSuggestion | taskId, originalBlockId, proposedStart, proposedEnd, reason |

### Deterministic Engine Rules

1. Fixed commitments and protected routines reserve time before flexible tasks are placed.
2. Flexible tasks are scheduled only within declared availability windows.
3. The scheduler ranks days by remaining capacity; high-priority or difficult tasks favour earlier valid days.
4. Each placement preserves a 10-15 minute buffer between blocks.
5. Manual calendar edits set `manualOverride` and are never replaced without the user’s action.
6. Only flexible, lower-priority, lower-urgency tasks can be proposed for rescheduling.
7. A proposed move is valid only when both affected days remain below the overload threshold.
8. When no valid move exists, the app offers recovery guidance instead of forcing a schedule change.

### Load-Score Rules

```text
TimeLoad% = urgency-weighted scheduled task hours / daily capacity * 100, capped at 100
MentalLoad% = 0.5 * (hours-weighted task difficulty * 20) + 0.5 * three-day mood average
PhysicalLoad% = three-day sleep-quality average
SocialLoad% = weekly self-report
ErrandsLoad% = pending or overdue errand tasks / 3 * 100, capped at 100
OverallLoad% = 0.30 * Time + 0.30 * Mental + 0.20 * Physical + 0.10 * Social + 0.10 * Errands
```

Thresholds: green `0-60%`, yellow `61-85%`, red `86%+`.

### Build Sequence

1. Define TypeScript entities and seed realistic demo data.
2. Build and test pure load-score functions.
3. Build and test auto-scheduling and reschedule-option functions.
4. Add local persistence.
5. Build onboarding and task-entry screens.
6. Build week timetable using engine output.
7. Add overload, check-in, and destress interactions.
8. Add polish and stretch features only after the end-to-end flow is stable.

## 6. Design System

### Design Principles

- Calm, practical, and non-judgmental.
- Prioritise immediate comprehension over visual decoration.
- Show the reason behind each score and suggestion.
- Keep high-frequency actions available from the current context.
- Use colour with text and icons; never colour alone.

### Visual Tokens

| Token | Direction |
| --- | --- |
| Load status | Green for manageable, amber for heavy, red for overloaded. |
| Base surfaces | Neutral light background with white content surfaces. |
| Primary action | One consistent accessible accent colour. |
| Typography | Clear sans-serif; compact labels and readable body text. |
| Spacing | 4px base unit; use 8px, 12px, 16px, 24px, and 32px intervals. |
| Radius | 8px maximum for cards, sheets, and form controls. |
| Icons | Lucide icons where available, always with accessible labels. |

### Reusable Components

- App header and bottom tab navigation.
- Capacity gauge with text value and five-category breakdown.
- Forward-projection banner.
- Hour-grid timetable and scheduled task block.
- Task form fields, category selector, priority control, and fixed/flexible toggle.
- Check-in selector for mood, sleep, and social state.
- Reschedule suggestion card with before/after load values and approve/reject controls.
- Destress anchored popover and recovery suggestion card.
- Loading, empty, validation, and error states.

### Required Screens

1. Onboarding
2. Today
3. Week timetable
4. Add and edit task
5. Overload intervention modal
6. Inline check-in widget
7. Destress popover
8. Profile and planning settings

## 7. Prototype Evidence

| Evidence | Required content | Rubric area |
| --- | --- | --- |
| Problem tree | Causes, central problem, and burnout consequences. | Ideation |
| Ideation mindmap | Alternative solution ideas and links between problem dimensions. | Ideation |
| Iteration log | Rejected ideas, changes, and rationale. | Ideation |
| Alternatives comparison | Several concepts compared before selecting this one. | Ideation / Creativity |
| Mentor feedback log | Feedback, decision, changed artefact, and date. | Ideation |
| Competitor comparison | Google Calendar, Notion, Motion, and the app’s differentiators. | Creativity |
| Architecture diagram | UI, local data, deterministic engine, optional LLM boundary. | Feasibility |
| Core-flow prototype | Onboarding to intervention and updated result. | Design |
| Before/after scenario | Alex’s load before and after accepting an intervention. | Impact |

### Required Demo Scenario

Alex has classes, part-time work, errands, poor sleep, and an approaching assignment. Adding the assignment pushes Wednesday into yellow or red. The app shows why, proposes a valid task move, and visibly lowers projected load after Alex accepts it. Alex then opens the destress control and receives a context-appropriate recovery action.

## 8. Delivery Plan

### Phase 1: Product Rules and Data

- Confirm every field, threshold, and scheduling rule.
- Define TypeScript types and seeded Alex demo data.
- Write test cases for normal, empty, full-capacity, overdue, and no-valid-slot cases.

### Phase 2: Engine

- Implement load-score calculation.
- Implement auto-scheduling and capacity checks.
- Implement reschedule suggestion selection.
- Verify expected outputs against the Alex scenario.

### Phase 3: Core UI

- Build onboarding and local persistence.
- Build task entry and week timetable.
- Connect timetable to scheduling output.
- Add manual move and resize behaviour.

### Phase 4: Intervention Flow

- Build overload modal and accept/reject state changes.
- Build inline check-in widget.
- Build destress popover and recovery suggestions.
- Verify the full primary flow on Android device or Expo Go.

### Phase 5: Evidence and Presentation

- Capture prototype screenshots for every core screen.
- Update the iteration log after mentor feedback.
- Create architecture, user-flow, and before/after diagrams.
- Rehearse the Alex demo: problem, prediction, action, outcome, impact.

### Definition of Done

- A new flexible task is automatically scheduled before its deadline.
- The timetable renders scheduled blocks at correct times and durations.
- The load engine calculates all five categories and the overall status.
- An overload creates only feasible, explainable suggestions.
- Accepting a suggestion updates the schedule and score.
- Check-ins and destress guidance work without navigating away from the timetable.
- The Alex demo completes end-to-end on an Android device.
