import { Task } from './task';

export type CircuitBreakerOptionType = 'swap' | 'scope_down' | 'reschedule' | 'burnout_debt';

export interface BaseInterventionOption {
  type: CircuitBreakerOptionType;
  title: string;
  description: string;
  badge: string;
  projectedLoad: number; // load % after this option is applied
}

export interface SwapOption extends BaseInterventionOption {
  type: 'swap';
  swappedTask: Task;
  targetNewDate: string;
}

export interface ScopeDownOption extends BaseInterventionOption {
  type: 'scope_down';
  immediateMinutes: number; // 45
  deferredMinutes: number;
  deferredDate: string;
}

export interface RescheduleOption extends BaseInterventionOption {
  type: 'reschedule';
  recommendedDate: string;
  recommendedStartTime: string;
  recommendedEndTime: string;
}

export interface BurnoutDebtOption extends BaseInterventionOption {
  type: 'burnout_debt';
  recoveryDate: string;
  recoveryDurationMinutes: number; // 30
  recoveryLockedSlot: string; // e.g. "10:00 - 10:30"
}

export type CircuitBreakerOption = SwapOption | ScopeDownOption | RescheduleOption | BurnoutDebtOption;

export interface CircuitBreakerPayload {
  triggered: boolean;
  currentLoad: number;
  projectedLoadWithoutIntervention: number;
  offendingTask: Task;
  options: CircuitBreakerOption[];
}
