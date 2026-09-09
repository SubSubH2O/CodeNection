import { AvatarType } from './avatar';
import { FiveDimensionLoad, LoadStatus } from './load';

export type TokenInteractionType = 'virtual_coffee' | 'no_reply_pass' | 'silent_nod';

export interface CoopMember {
  id: string;
  name: string;
  avatarType: AvatarType;
  overallStatus: LoadStatus;
  primaryLoadFactor: string;
  load: FiveDimensionLoad;
  recentTokensReceived: TokenInteractionType[];
}

export interface CoopCircle {
  id: string;
  name: string;
  members: CoopMember[];
}
