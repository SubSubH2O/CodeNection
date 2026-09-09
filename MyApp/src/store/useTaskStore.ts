import { createStore, useStore } from './createStore';
import { Task } from '../types/task';

export interface TaskStoreState {
  tasks: Task[];
  selectedDate: string; // YYYY-MM-DD
}

const initialTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Database Schema Design',
    category: 'coursework',
    priority: 'high',
    isFlexible: false,
    durationMinutes: 120,
    dueDate: '2026-09-11',
    scheduledDate: '2026-09-10',
    startTime: '09:00',
    endTime: '11:00',
    difficulty: 4,
    milestones: [
      { id: 'm-1', title: 'ER Diagram draft', durationMinutes: 45, completed: true },
      { id: 'm-2', title: 'DDL script normalization', durationMinutes: 75, completed: false },
    ],
    completed: false,
    primaryDimension: 'mental',
  },
  {
    id: 'task-2',
    title: 'Operating Systems Lab',
    category: 'coursework',
    priority: 'high',
    isFlexible: true,
    durationMinutes: 150,
    dueDate: '2026-09-12',
    scheduledDate: '2026-09-10',
    startTime: '13:00',
    endTime: '15:30',
    difficulty: 5,
    milestones: [],
    completed: false,
    primaryDimension: 'mental',
  },
  {
    id: 'task-3',
    title: 'Campus Bookstore Shift',
    category: 'work',
    priority: 'medium',
    isFlexible: false,
    durationMinutes: 180,
    dueDate: '2026-09-10',
    scheduledDate: '2026-09-10',
    startTime: '16:00',
    endTime: '19:00',
    difficulty: 3,
    milestones: [],
    completed: false,
    primaryDimension: 'physical',
  },
  {
    id: 'task-4',
    title: 'Groceries & Meal Prep',
    category: 'errands',
    priority: 'low',
    isFlexible: true,
    durationMinutes: 60,
    dueDate: '2026-09-10',
    scheduledDate: '2026-09-10',
    startTime: '19:30',
    endTime: '20:30',
    difficulty: 2,
    milestones: [],
    completed: false,
    primaryDimension: 'errands',
  },
];

export const taskStore = createStore<TaskStoreState>({
  tasks: initialTasks,
  selectedDate: '2026-09-10',
});

export function useTasks() {
  return useStore(taskStore, (s) => s.tasks);
}

export function useSelectedDate() {
  return useStore(taskStore, (s) => s.selectedDate);
}

export const taskActions = {
  setSelectedDate: (date: string) => {
    taskStore.setState({ selectedDate: date });
  },

  addTask: (task: Task) => {
    taskStore.setState((s) => ({ tasks: [...s.tasks, task] }));
  },

  updateTask: (taskId: string, updates: Partial<Task>) => {
    taskStore.setState((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    }));
  },

  removeTask: (taskId: string) => {
    taskStore.setState((s) => ({
      tasks: s.tasks.filter((t) => t.id !== taskId),
    }));
  },

  toggleComplete: (taskId: string) => {
    taskStore.setState((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    }));
  },

  postponeTask: (taskId: string, targetDate: string) => {
    taskStore.setState((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, scheduledDate: targetDate, startTime: undefined, endTime: undefined }
          : t
      ),
    }));
  },

  addBurnoutDebtLock: (date: string, startTime: string, endTime: string, durationMinutes: number = 30) => {
    const recoveryTask: Task = {
      id: `recovery-lock-${Date.now()}`,
      title: 'Compulsory Recovery Buffer (Burnout Debt)',
      category: 'recovery',
      priority: 'high',
      isFlexible: false,
      durationMinutes,
      dueDate: date,
      scheduledDate: date,
      startTime,
      endTime,
      difficulty: 1,
      milestones: [],
      completed: false,
      primaryDimension: 'physical',
      isBurnoutDebtLocked: true,
    };
    taskStore.setState((s) => ({ tasks: [...s.tasks, recoveryTask] }));
  },
};
