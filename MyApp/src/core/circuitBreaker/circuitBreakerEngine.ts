import { Task } from '../../types/task';
import {
  CircuitBreakerPayload,
  CircuitBreakerOption,
  SwapOption,
  ScopeDownOption,
  RescheduleOption,
  BurnoutDebtOption,
} from '../../types/circuitBreaker';
import { calculate5DLoad } from '../load/calculateLoad';
import { LOAD_THRESHOLDS } from '../../types/load';

export function evaluateCircuitBreaker(
  currentTasks: Task[],
  newTask: Task,
  dailyCapacityMinutes: number = 480
): CircuitBreakerPayload {
  const targetDate = newTask.scheduledDate;
  const currentDayTasks = currentTasks.filter((t) => t.scheduledDate === targetDate);

  // Baseline load
  const baselineResult = calculate5DLoad({
    tasks: currentDayTasks,
    dailyCapacityMinutes,
  });

  // Projected load if new task is accepted without changes
  const combinedTasks = [...currentDayTasks, newTask];
  const projectedResult = calculate5DLoad({
    tasks: combinedTasks,
    dailyCapacityMinutes,
  });

  const triggered = projectedResult.overall >= LOAD_THRESHOLDS.CIRCUIT_BREAKER_THRESHOLD;

  if (!triggered) {
    return {
      triggered: false,
      currentLoad: baselineResult.overall,
      projectedLoadWithoutIntervention: projectedResult.overall,
      offendingTask: newTask,
      options: [],
    };
  }

  // 1. Swap Option: find lowest priority flexible task in current day
  const flexibleCandidates = currentDayTasks.filter((t) => t.isFlexible && !t.completed);
  // Sort by priority (low first), then errands first
  flexibleCandidates.sort((a, b) => {
    const priorityWeight = { low: 1, medium: 2, high: 3 };
    return priorityWeight[a.priority] - priorityWeight[b.priority];
  });

  const candidateToSwap = flexibleCandidates[0] || currentDayTasks.find((t) => t.isFlexible);

  const swapOptions: CircuitBreakerOption[] = [];
  if (candidateToSwap) {
    const tasksAfterSwap = combinedTasks.filter((t) => t.id !== candidateToSwap.id);
    const swapLoad = calculate5DLoad({
      tasks: tasksAfterSwap,
      dailyCapacityMinutes,
    }).overall;

    const swapOpt: SwapOption = {
      type: 'swap',
      title: `Swap: Postpone "${candidateToSwap.title}"`,
      description: `Defers flexible ${candidateToSwap.category} task (${candidateToSwap.durationMinutes}m) to next free day.`,
      badge: 'Drop Errand',
      projectedLoad: swapLoad,
      swappedTask: candidateToSwap,
      targetNewDate: getNextDay(targetDate),
    };
    swapOptions.push(swapOpt);
  }

  // 2. Scope Down Option: keep 45 min starter tonight, defer the rest
  const immediateMinutes = 45;
  const deferredMinutes = Math.max(0, newTask.durationMinutes - immediateMinutes);
  const scopedNewTask: Task = { ...newTask, durationMinutes: immediateMinutes };
  const scopeDownLoad = calculate5DLoad({
    tasks: [...currentDayTasks, scopedNewTask],
    dailyCapacityMinutes,
  }).overall;

  const scopeDownOpt: ScopeDownOption = {
    type: 'scope_down',
    title: `Scope Down: 45-Minute Sprint Outline`,
    description: `Dedicate 45 minutes to build outline and draft tonight; postpone remaining ${deferredMinutes}m to later.`,
    badge: 'Lighten Tonight',
    projectedLoad: scopeDownLoad,
    immediateMinutes,
    deferredMinutes,
    deferredDate: getNextDay(targetDate),
  };

  // 3. Reschedule Option: move entire new task to next day
  const rescheduleOpt: RescheduleOption = {
    type: 'reschedule',
    title: `Reschedule: Move to ${getNextDay(targetDate)}`,
    description: `Schedules the entire task on the next day with verified open capacity.`,
    badge: 'Shift Slot',
    projectedLoad: baselineResult.overall,
    recommendedDate: getNextDay(targetDate),
    recommendedStartTime: '10:00',
    recommendedEndTime: calculateEndTime('10:00', newTask.durationMinutes),
  };

  // 4. Burnout Debt Option: force add, but enforce 30 min locked recovery next day
  const burnoutDebtOpt: BurnoutDebtOption = {
    type: 'burnout_debt',
    title: `Burnout Debt: Force Add + Lock Recovery Tomorrow`,
    description: `Permits adding the task tonight, but automatically locks a non-negotiable 30m recovery block on tomorrow's calendar.`,
    badge: 'Debt Penalty',
    projectedLoad: projectedResult.overall,
    recoveryDate: getNextDay(targetDate),
    recoveryDurationMinutes: 30,
    recoveryLockedSlot: '11:00 - 11:30',
  };

  const options: CircuitBreakerOption[] = [
    ...swapOptions,
    scopeDownOpt,
    rescheduleOpt,
    burnoutDebtOpt,
  ];

  return {
    triggered: true,
    currentLoad: baselineResult.overall,
    projectedLoadWithoutIntervention: projectedResult.overall,
    offendingTask: newTask,
    options,
  };
}

function getNextDay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  } catch {
    return '2026-09-11';
  }
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hStr, mStr] = startTime.split(':');
  const totalM = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + durationMinutes;
  const endH = Math.floor(totalM / 60) % 24;
  const endM = totalM % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
}
