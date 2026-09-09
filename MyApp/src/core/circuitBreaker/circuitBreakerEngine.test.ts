import { evaluateCircuitBreaker } from './circuitBreakerEngine';
import { Task } from '../../types/task';
import {
  SwapOption,
  ScopeDownOption,
  RescheduleOption,
  BurnoutDebtOption,
} from '../../types/circuitBreaker';

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertStrictEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) throw new Error(message || `Expected ${expected}, got ${actual}`);
}

export function testCircuitBreaker(): void {
  console.log('[TEST] Starting Circuit Breaker unit tests...');

  const currentTasks: Task[] = [
    {
      id: 't-1',
      title: 'Operating Systems Midterm Study',
      category: 'coursework',
      priority: 'high',
      isFlexible: false,
      durationMinutes: 240,
      dueDate: '2026-09-10',
      scheduledDate: '2026-09-10',
      difficulty: 5,
      milestones: [],
      completed: false,
      primaryDimension: 'mental',
    },
    {
      id: 't-2',
      title: 'Grocery Run & Dishes',
      category: 'errands',
      priority: 'low',
      isFlexible: true,
      durationMinutes: 60,
      dueDate: '2026-09-10',
      scheduledDate: '2026-09-10',
      difficulty: 2,
      milestones: [],
      completed: false,
      primaryDimension: 'errands',
    },
  ];

  // Case 1: Small task added below threshold (does not trigger breaker)
  const smallTask: Task = {
    id: 't-small',
    title: 'Reply to Professor Email',
    category: 'errands',
    priority: 'low',
    isFlexible: true,
    durationMinutes: 15,
    dueDate: '2026-09-10',
    scheduledDate: '2026-09-10',
    difficulty: 1,
    milestones: [],
    completed: false,
    primaryDimension: 'errands',
  };

  const safeResult = evaluateCircuitBreaker(currentTasks, smallTask, 480);
  assertStrictEqual(safeResult.triggered, false, 'Safe task should not trigger breaker');
  assertStrictEqual(safeResult.options.length, 0, 'No options when not triggered');

  // Case 2: Massive 4-hour lab task added (triggers 85% overload breaker)
  const heavyTask: Task = {
    id: 't-heavy',
    title: 'Distributed Systems Project Sprint',
    category: 'coursework',
    priority: 'high',
    isFlexible: false,
    durationMinutes: 240,
    dueDate: '2026-09-10',
    scheduledDate: '2026-09-10',
    difficulty: 5,
    milestones: [],
    completed: false,
    primaryDimension: 'mental',
  };

  const overloadResult = evaluateCircuitBreaker(currentTasks, heavyTask, 480);
  assert(overloadResult.triggered, 'Heavy task must trigger circuit breaker');
  assert(overloadResult.projectedLoadWithoutIntervention >= 85, 'Projected load must be >= 85%');

  // Check 4 options present
  const types = overloadResult.options.map((o) => o.type);
  assert(types.includes('swap'), 'Swap option must be provided');
  assert(types.includes('scope_down'), 'Scope down option must be provided');
  assert(types.includes('reschedule'), 'Reschedule option must be provided');
  assert(types.includes('burnout_debt'), 'Burnout debt option must be provided');

  // Verify Swap details
  const swapOpt = overloadResult.options.find((o) => o.type === 'swap') as SwapOption;
  assertStrictEqual(swapOpt.swappedTask.id, 't-2', 'Should swap lowest priority errand');

  // Verify Scope Down details
  const scopeOpt = overloadResult.options.find((o) => o.type === 'scope_down') as ScopeDownOption;
  assertStrictEqual(scopeOpt.immediateMinutes, 45, 'Scope down immediate sprint should be 45m');

  // Verify Burnout Debt details
  const debtOpt = overloadResult.options.find((o) => o.type === 'burnout_debt') as BurnoutDebtOption;
  assertStrictEqual(debtOpt.recoveryDurationMinutes, 30, 'Burnout debt must enforce 30m lock');

  console.log('[TEST] Circuit Breaker unit tests PASSED cleanly.');
}

testCircuitBreaker();
