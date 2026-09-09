import { createStore, useStore } from './createStore';
import { CoopCircle, CoopMember, TokenInteractionType } from '../types/coop';

const initialCircle: CoopCircle = {
  id: 'circle-1',
  name: 'Focus Pod',
  members: [
    {
      id: 'm-1',
      name: 'Elena',
      avatarType: 'tree',
      overallStatus: 'yellow',
      primaryLoadFactor: '3 back-to-back labs',
      load: { mental: 78, physical: 62, social: 40, errands: 50, time: 75 },
      recentTokensReceived: ['virtual_coffee'],
    },
    {
      id: 'm-2',
      name: 'Kai',
      avatarType: 'cat',
      overallStatus: 'red',
      primaryLoadFactor: 'Final design submission tomorrow',
      load: { mental: 92, physical: 84, social: 25, errands: 70, time: 90 },
      recentTokensReceived: ['no_reply_pass'],
    },
  ],
};

export interface CoopStoreState {
  circle: CoopCircle;
  myReceivedTokens: TokenInteractionType[];
}

export const coopStore = createStore<CoopStoreState>({
  circle: initialCircle,
  myReceivedTokens: ['virtual_coffee'],
});

export const coopActions = {
  sendTokenToMember: (memberId: string, token: TokenInteractionType) => {
    coopStore.setState((s) => ({
      circle: {
        ...s.circle,
        members: s.circle.members.map((m) =>
          m.id === memberId
            ? { ...m, recentTokensReceived: [token, ...m.recentTokensReceived.slice(0, 4)] }
            : m
        ),
      },
    }));
  },

  receiveToken: (token: TokenInteractionType) => {
    coopStore.setState((s) => ({
      myReceivedTokens: [token, ...s.myReceivedTokens],
    }));
  },
};

export function useCoopCircle(): CoopCircle {
  return useStore(coopStore, (s) => s.circle);
}

export function useMyReceivedTokens(): TokenInteractionType[] {
  return useStore(coopStore, (s) => s.myReceivedTokens);
}
