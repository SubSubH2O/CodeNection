import { createStore, useStore } from './createStore';
import { AvatarType } from '../types/avatar';

export interface AvatarStoreState {
  activeAvatar: AvatarType;
  petName: string;
}

export const avatarStore = createStore<AvatarStoreState>({
  activeAvatar: 'tree',
  petName: 'Mochi',
});

export const avatarActions = {
  setAvatar: (type: AvatarType) => {
    avatarStore.setState({ activeAvatar: type });
  },

  setPetName: (name: string) => {
    avatarStore.setState({ petName: name });
  },

  toggleAvatar: () => {
    avatarStore.setState((s) => ({
      activeAvatar: s.activeAvatar === 'tree' ? 'cat' : 'tree',
    }));
  },
};

export function useActiveAvatar(): AvatarType {
  return useStore(avatarStore, (s) => s.activeAvatar);
}

export function usePetName(): string {
  return useStore(avatarStore, (s) => s.petName);
}
