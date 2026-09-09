import { LoadDimension, LoadStatus } from './load';

export type AvatarType = 'tree' | 'cat';

export interface BranchVisualState {
  dimension: LoadDimension;
  label: string;
  load: number;
  status: LoadStatus;
  isDrooping: boolean;
  isBlooming: boolean;
  colorHex: string;
}

export interface TreeAvatarState {
  type: 'tree';
  overallStatus: LoadStatus;
  branches: Record<LoadDimension, BranchVisualState>;
}

export interface RoomCornerVisualState {
  dimension: LoadDimension;
  cornerName: string;
  load: number;
  status: LoadStatus;
  clutterLevel: number; // 0 - 3
  description: string;
}

export interface CatPostureState {
  moodText: string;
  isWearingPajamas: boolean;
  isExhaustedLoaf: boolean;
  activityDescription: string;
}

export interface CatAvatarState {
  type: 'cat';
  overallStatus: LoadStatus;
  posture: CatPostureState;
  corners: Record<LoadDimension, RoomCornerVisualState>;
}

export type AvatarVisualState = TreeAvatarState | CatAvatarState;
