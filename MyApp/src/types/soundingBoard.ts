import { LoadDimension } from './load';

export type DeStressActionType = 'leave_script' | 'box_breathing' | 'grounding' | 'gentle_walk';

export interface DeStressAction {
  id: string;
  type: DeStressActionType;
  title: string;
  durationMinutes: number;
  instruction: string;
  payload?: {
    emailSubject?: string;
    emailBody?: string;
    breathingCycleSeconds?: {
      inhale: number;
      hold: number;
      exhale: number;
      rest: number;
    };
  };
}

export interface VentingEntry {
  id: string;
  timestamp: string;
  content: string;
  dominantDimension: LoadDimension;
  recommendedActions: DeStressAction[];
}
