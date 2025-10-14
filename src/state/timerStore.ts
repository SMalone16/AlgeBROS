import { create } from 'zustand'
import type { TurnTimerSnapshot } from '../types'

export interface TurnTimerStore extends TurnTimerSnapshot {
  startTimer: (durationSeconds: number) => void
  tick: () => void
  pause: () => void
  resume: () => void
  reset: () => void
}

const initialState: TurnTimerSnapshot = {
  secondsRemaining: 0,
  isPaused: true,
}

export const useTurnTimerStore = create<TurnTimerStore>((set) => ({
  ...initialState,
  startTimer: (durationSeconds) =>
    set({ secondsRemaining: durationSeconds, isPaused: false }),
  tick: () =>
    set((state) => {
      if (state.isPaused || state.secondsRemaining <= 0) {
        return state
      }

      /** TODO: Emit events for overtime/turn transitions once networking lands. */
      return {
        ...state,
        secondsRemaining: Math.max(0, state.secondsRemaining - 1),
      }
    }),
  pause: () => set((state) => ({ ...state, isPaused: true })),
  resume: () =>
    set((state) => ({
      ...state,
      isPaused: false,
    })),
  reset: () => set(initialState),
}))

export const selectIsTimerExpired = (state: TurnTimerStore): boolean =>
  state.secondsRemaining === 0 && !state.isPaused
