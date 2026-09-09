import { createStore, useStore } from './createStore';
import { calculate5DLoad } from '../core/load/calculateLoad';
import { taskStore } from './useTaskStore';
import { FiveDimensionLoad, LoadCalculationResult, LoadDimension } from '../types/load';

export interface SubjectiveCheckIn {
  moodScore: number;    // 1 - 5
  sleepQuality: number; // 1 - 5
  socialDrain: number;  // 1 - 5
}

export interface LoadStoreState {
  dailyCapacityMinutes: number;
  checkIn: SubjectiveCheckIn;
}

export const loadStore = createStore<LoadStoreState>({
  dailyCapacityMinutes: 480, // 8 hours
  checkIn: {
    moodScore: 3,
    sleepQuality: 3,
    socialDrain: 2,
  },
});

export const loadActions = {
  setCapacity: (minutes: number) => {
    loadStore.setState({ dailyCapacityMinutes: minutes });
  },

  updateCheckIn: (checkIn: Partial<SubjectiveCheckIn>) => {
    loadStore.setState((s) => ({
      checkIn: { ...s.checkIn, ...checkIn },
    }));
  },
};

export function useLoadMetrics(): LoadCalculationResult {
  const tasks = useStore(taskStore, (s) => s.tasks);
  const selectedDate = useStore(taskStore, (s) => s.selectedDate);
  const state = useStore(loadStore);

  const dayTasks = tasks.filter((t) => t.scheduledDate === selectedDate);

  return calculate5DLoad({
    tasks: dayTasks,
    dailyCapacityMinutes: state.dailyCapacityMinutes,
    subjectiveCheckIn: state.checkIn,
  });
}

export function useCheckIn(): SubjectiveCheckIn {
  return useStore(loadStore, (s) => s.checkIn);
}
