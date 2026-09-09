export type LoadDimension = 'mental' | 'physical' | 'social' | 'errands' | 'time';

export type LoadStatus = 'green' | 'yellow' | 'red';

export interface FiveDimensionLoad {
  mental: number;    // 0 - 100
  physical: number;  // 0 - 100
  social: number;    // 0 - 100
  errands: number;   // 0 - 100
  time: number;      // 0 - 100
}

export interface DimensionWeightConfig {
  mental: number;
  physical: number;
  social: number;
  errands: number;
  time: number;
}

export interface LoadCalculationResult {
  dimensions: FiveDimensionLoad;
  overall: number; // 0 - 100
  status: LoadStatus;
  isOverloaded: boolean; // overall >= 85
  primaryStressDimension: LoadDimension;
}

export const LOAD_THRESHOLDS = {
  GREEN_MAX: 60,
  YELLOW_MAX: 85,
  CIRCUIT_BREAKER_THRESHOLD: 85,
} as const;

export const DEFAULT_DIMENSION_WEIGHTS: DimensionWeightConfig = {
  time: 0.30,
  mental: 0.30,
  physical: 0.20,
  social: 0.10,
  errands: 0.10,
};
