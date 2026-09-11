import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './model';
import { emptyWeek, makeDemo } from './demo';
import { Action, parseSaved, reducer } from './state';

const KEY = 'loadtree-demo-v5';
const Context = createContext<{ state: AppState; dispatch: React.Dispatch<Action>; ready: boolean; storageError: boolean } | null>(null);
export function LoadTreeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer((s: AppState, a: Action | { type: 'hydrate'; state: AppState }) => a.type === 'hydrate' ? a.state : reducer(s, a), emptyWeek());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(value => {
      if (!active) return;
      const saved = parseSaved(value);
      if (saved) dispatch({ type: 'hydrate', state: saved });
      else if (value) setStorageError(true);
    }).catch(() => { if (active) setStorageError(true); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify({ ...state, undo: null })).catch(() => setStorageError(true)); }, 120);
    return () => clearTimeout(timer);
  }, [state, ready]);
  return <Context.Provider value={{ state, dispatch, ready, storageError }}>{children}</Context.Provider>;
}
export function useLoadTree() {
  const value = useContext(Context);
  if (!value) throw new Error('LoadTreeProvider is required.');
  return value;
}
