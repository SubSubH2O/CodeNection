import { FiveDimensionLoad, LoadDimension, LoadStatus } from '../../types/load';
import { determineStatus } from '../load/calculateLoad';
import {
  BranchVisualState,
  CatAvatarState,
  CatPostureState,
  RoomCornerVisualState,
  TreeAvatarState,
} from '../../types/avatar';

const DIMENSION_LABELS: Record<LoadDimension, string> = {
  mental: 'Mental',
  physical: 'Physical',
  social: 'Social',
  errands: 'Errands',
  time: 'Time Load',
};

const DIMENSION_COLORS: Record<LoadDimension, { green: string; yellow: string; red: string }> = {
  mental: { green: '#8B5E83', yellow: '#A87A9F', red: '#C44D56' },
  physical: { green: '#4C7A67', yellow: '#7A9A8B', red: '#D15A42' },
  social: { green: '#5E6FA3', yellow: '#8493C4', red: '#C05C72' },
  errands: { green: '#A98B4A', yellow: '#C4A76A', red: '#CE6C40' },
  time: { green: '#3E6E8E', yellow: '#6795B4', red: '#D45B5B' },
};

export function mapToTreeAvatar(load: FiveDimensionLoad, overallStatus: LoadStatus): TreeAvatarState {
  const branches = {} as Record<LoadDimension, BranchVisualState>;

  (Object.keys(load) as LoadDimension[]).forEach((dim) => {
    const val = load[dim];
    const status = determineStatus(val);
    const isDrooping = val > 75;
    const isBlooming = val <= 50;
    const colorHex = DIMENSION_COLORS[dim][status];

    branches[dim] = {
      dimension: dim,
      label: DIMENSION_LABELS[dim],
      load: val,
      status,
      isDrooping,
      isBlooming,
      colorHex,
    };
  });

  return {
    type: 'tree',
    overallStatus,
    branches,
  };
}

export function mapToCatAvatar(load: FiveDimensionLoad, overallStatus: LoadStatus): CatAvatarState {
  const isPhysicalHigh = load.physical > 70;
  const isMentalHigh = load.mental > 75;

  let moodText = 'Relaxed & observing';
  if (overallStatus === 'red') {
    moodText = 'Heavy fatigue — resting needed';
  } else if (overallStatus === 'yellow') {
    moodText = 'Moderate pace — taking breaks';
  }

  const posture: CatPostureState = {
    moodText,
    isWearingPajamas: isPhysicalHigh,
    isExhaustedLoaf: load.physical > 80 || overallStatus === 'red',
    activityDescription: isMentalHigh
      ? 'Cat napping beside a giant stack of coursework notes'
      : isPhysicalHigh
      ? 'Cat curled in oversized flannel pajamas, recharging'
      : 'Cat lightly roaming around an orderly quiet room',
  };

  const corners: Record<LoadDimension, RoomCornerVisualState> = {
    mental: {
      dimension: 'mental',
      cornerName: 'Study Desk',
      load: load.mental,
      status: determineStatus(load.mental),
      clutterLevel: load.mental > 80 ? 3 : load.mental > 50 ? 2 : 1,
      description: load.mental > 75 ? 'Books and papers stacked high' : 'Clear desk with open notebook',
    },
    physical: {
      dimension: 'physical',
      cornerName: 'Sleeping Cushion',
      load: load.physical,
      status: determineStatus(load.physical),
      clutterLevel: load.physical > 80 ? 3 : load.physical > 50 ? 2 : 1,
      description: load.physical > 75 ? 'Thick quilt and soft slippers deployed' : 'Neat linen bed',
    },
    social: {
      dimension: 'social',
      cornerName: 'Balcony Window',
      load: load.social,
      status: determineStatus(load.social),
      clutterLevel: load.social > 80 ? 3 : load.social > 50 ? 2 : 1,
      description: load.social > 75 ? 'Curtains half-drawn for quiet time' : 'Sunlit window perch',
    },
    errands: {
      dimension: 'errands',
      cornerName: 'Utility Shelf',
      load: load.errands,
      status: determineStatus(load.errands),
      clutterLevel: load.errands > 80 ? 3 : load.errands > 50 ? 2 : 1,
      description: load.errands > 75 ? 'Laundry basket full, errands pending' : 'Tidy utility cabinet',
    },
    time: {
      dimension: 'time',
      cornerName: 'Wall Clock & Shelf',
      load: load.time,
      status: determineStatus(load.time),
      clutterLevel: load.time > 80 ? 3 : load.time > 50 ? 2 : 1,
      description: load.time > 85 ? 'Ticking rapid pace, full calendar blocks' : 'Calm steady pendulum',
    },
  };

  return {
    type: 'cat',
    overallStatus,
    posture,
    corners,
  };
}
