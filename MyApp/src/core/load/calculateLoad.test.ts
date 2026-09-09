import { calculate5DLoad, determineStatus, clamp } from './calculateLoad';
import { Task } from '../../types/task';

// Minimal assertion helper without requiring @types/node
function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertStrictEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but received ${actual}`);
  }
}

export function testCalculateLoad(): void {
  // 1. Clamp helper
  assertStrictEqual(clamp(-10), 0, 'clamp(-10) should be 0');
  assertStrictEqual(clamp(50), 50, 'clamp(50) should be 50');
  assertStrictEqual(clamp(150), 100, 'clamp(150) should be 100');

  // 2. Status boundaries
  assertStrictEqual(determineStatus(0), 'green');
  assertStrictEqual(determineStatus(60), 'green');
  assertStrictEqual(determineStatus(61), 'yellow');
  assertStrictEqual(determineStatus(85), 'yellow');
  assertStrictEqual(determineStatus(86), 'red');
  assertStrictEqual(determineStatus(100), 'red');

  // 3. Empty schedule
  const emptyResult = calculate5DLoad({
    tasks: [],
    dailyCapacityMinutes: 480,
    subjectiveCheckIn: { moodScore: 1, sleepQuality: 1, socialDrain: 1 },
  });
  assertStrictEqual(emptyResult.dimensions.time, 0);
  assertStrictEqual(emptyResult.status, 'green');
  assertStrictEqual(emptyResult.isOverloaded, false);

  // 4. Heavy schedule crossing 85% Circuit Breaker threshold
  const heavyTasks: Task[] = [
    {
      id: '1',
      title: 'Operating Systems Lab',
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
      id: '2',
      title: 'Part-time Shift',
      category: 'work',
      priority: 'high',
      isFlexible: false,
      durationMinutes: 180,
      dueDate: '2026-09-10',
      scheduledDate: '2026-09-10',
      difficulty: 4,
      milestones: [],
      completed: false,
      primaryDimension: 'physical',
    },
    {
      id: '3',
      title: 'Grocery Run',
      category: 'errands',
      priority: 'medium',
      isFlexible: true,
      durationMinutes: 90,
      dueDate: '2026-09-10',
      scheduledDate: '2026-09-10',
      difficulty: 2,
      milestones: [],
      completed: false,
      primaryDimension: 'errands',
    },
  ];

  const heavyResult = calculate5DLoad({
    tasks: heavyTasks,
    dailyCapacityMinutes: 480,
    subjectiveCheckIn: { moodScore: 4, sleepQuality: 4, socialDrain: 3 },
  });

  assert(heavyResult.isOverloaded, 'Schedule should be marked overloaded');
  assertStrictEqual(heavyResult.status, 'red', 'Status should be red');
  assert(heavyResult.overall >= 85, `Expected overall >= 85, got ${heavyResult.overall}`);
}

testCalculateLoad();
