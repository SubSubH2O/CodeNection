import {
  DEFAULT_DIMENSION_WEIGHTS,
  DimensionWeightConfig,
  FiveDimensionLoad,
  LOAD_THRESHOLDS,
  LoadCalculationResult,
  LoadDimension,
  LoadStatus,
} from '../../types/load';
import { Task } from '../../types/task';

export interface DailyLoadInput {
  tasks: Task[];
  dailyCapacityMinutes: number; // e.g. 480 (8 hours)
  subjectiveCheckIn?: {
    moodScore?: number; // 1 (great) - 5 (exhausted)
    sleepQuality?: number; // 1 (rested) - 5 (severely deprived)
    socialDrain?: number; // 1 (refreshed) - 5 (drained)
  };
}

export function clamp(value: number, min: number = 0, max: number = 100): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

export function determineStatus(score: number): LoadStatus {
  if (score <= LOAD_THRESHOLDS.GREEN_MAX) return 'green';
  if (score <= LOAD_THRESHOLDS.YELLOW_MAX) return 'yellow';
  return 'red';
}

export function calculate5DLoad(
  input: DailyLoadInput,
  weights: DimensionWeightConfig = DEFAULT_DIMENSION_WEIGHTS
): LoadCalculationResult {
  const { tasks, dailyCapacityMinutes, subjectiveCheckIn } = input;
  const capacity = dailyCapacityMinutes > 0 ? dailyCapacityMinutes : 480;

  // 1. Time Load
  const totalScheduledMinutes = tasks
    .filter(t => !t.completed)
    .reduce((sum, t) => sum + t.durationMinutes, 0);
  const rawTimeLoad = (totalScheduledMinutes / capacity) * 100;
  const timeLoad = clamp(rawTimeLoad);

  // 2. Mental Load (weighted by task difficulty and coursework/work duration)
  const mentalTasks = tasks.filter(t => !t.completed && (t.category === 'coursework' || t.category === 'work' || t.primaryDimension === 'mental'));
  let mentalMinutesWeighted = 0;
  mentalTasks.forEach(t => {
    const diffMultiplier = Math.max(1, Math.min(5, t.difficulty || 3));
    mentalMinutesWeighted += t.durationMinutes * (diffMultiplier / 3);
  });
  const rawMentalTaskScore = capacity > 0 ? (mentalMinutesWeighted / capacity) * 100 : 0;
  const moodFactor = subjectiveCheckIn?.moodScore ? ((subjectiveCheckIn.moodScore - 1) / 4) * 100 : 40;
  const mentalLoad = clamp(0.6 * rawMentalTaskScore + 0.4 * moodFactor);

  // 3. Physical Load (sleep deficit & physical exhaustion)
  const sleepFactor = subjectiveCheckIn?.sleepQuality ? ((subjectiveCheckIn.sleepQuality - 1) / 4) * 100 : 35;
  const longSessionCount = tasks.filter(t => !t.completed && t.durationMinutes >= 120).length;
  const sessionPhysicalPenalty = longSessionCount * 15;
  const physicalLoad = clamp(sleepFactor + sessionPhysicalPenalty);

  // 4. Social Load
  const socialTasksMinutes = tasks
    .filter(t => !t.completed && (t.category === 'social' || t.primaryDimension === 'social'))
    .reduce((sum, t) => sum + t.durationMinutes, 0);
  const socialTaskScore = (socialTasksMinutes / (capacity * 0.4)) * 100;
  const socialDrainFactor = subjectiveCheckIn?.socialDrain ? ((subjectiveCheckIn.socialDrain - 1) / 4) * 100 : 30;
  const socialLoad = clamp(0.5 * socialTaskScore + 0.5 * socialDrainFactor);

  // 5. Errands Load
  const pendingErrands = tasks.filter(t => !t.completed && (t.category === 'errands' || t.primaryDimension === 'errands'));
  const errandCountScore = (pendingErrands.length / 4) * 100;
  const errandMinutes = pendingErrands.reduce((sum, t) => sum + t.durationMinutes, 0);
  const errandMinutesScore = (errandMinutes / 120) * 100;
  const errandsLoad = clamp(0.5 * errandCountScore + 0.5 * errandMinutesScore);

  const dimensions: FiveDimensionLoad = {
    mental: mentalLoad,
    physical: physicalLoad,
    social: socialLoad,
    errands: errandsLoad,
    time: timeLoad,
  };

  // If scheduled time exceeds capacity, boost physical and mental strain
  const overtimePenalty = rawTimeLoad > 100 ? (rawTimeLoad - 100) * 0.5 : 0;
  dimensions.physical = clamp(dimensions.physical + overtimePenalty);
  dimensions.mental = clamp(dimensions.mental + overtimePenalty);

  // Overall Weighted Score
  const weightedBase =
    dimensions.time * weights.time +
    dimensions.mental * weights.mental +
    dimensions.physical * weights.physical +
    dimensions.social * weights.social +
    dimensions.errands * weights.errands;

  // If time load or mental load alone is maxed out, elevate overall load
  const maxCriticalDimension = Math.max(dimensions.time, dimensions.mental);
  const overall = clamp(Math.max(weightedBase, maxCriticalDimension * 0.88));

  const status = determineStatus(overall);
  const isOverloaded = overall >= LOAD_THRESHOLDS.CIRCUIT_BREAKER_THRESHOLD || dimensions.time >= 95;

  // Determine dominant dimension
  let maxDim: LoadDimension = 'time';
  let maxVal = -1;
  (Object.keys(dimensions) as LoadDimension[]).forEach(dim => {
    if (dimensions[dim] > maxVal) {
      maxVal = dimensions[dim];
      maxDim = dim;
    }
  });

  return {
    dimensions,
    overall,
    status,
    isOverloaded,
    primaryStressDimension: maxDim,
  };
}
