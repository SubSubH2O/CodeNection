import { LoadDimension } from './load';

export type TaskCategory = 'coursework' | 'work' | 'errands' | 'social' | 'personal' | 'recovery';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Milestone {
  id: string;
  title: string;
  durationMinutes: number;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  isFlexible: boolean;
  durationMinutes: number;
  dueDate: string; // ISO date string YYYY-MM-DD
  scheduledDate: string; // ISO date string YYYY-MM-DD
  startTime?: string; // HH:mm format, e.g. "14:00"
  endTime?: string;   // HH:mm format, e.g. "16:00"
  difficulty: number; // 1 - 5
  milestones: Milestone[];
  completed: boolean;
  primaryDimension: LoadDimension;
  isBurnoutDebtLocked?: boolean; // If locked recovery block
}

export interface DailyScheduleSlot {
  id: string;
  taskId: string;
  title: string;
  category: TaskCategory;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isFlexible: boolean;
  isBurnoutDebtLocked: boolean;
}
