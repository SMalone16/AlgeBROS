import { create } from 'zustand'
import type { TurnTimerSnapshot } from '../types'

export interface TurnTimerStore extends TurnTimerSnapshot {
  startTimer: (durationSeconds: number) => void
  tick: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  startNextTurn: (durationSeconds?: number) => void
  canScheduleMove: () => boolean
  consumeMove: () => boolean
  resetMoveBudget: () => void
}

export const TURN_MOVE_CAP = 3

export const createInitialTurnTimerSnapshot = (): TurnTimerSnapshot => ({
  secondsRemaining: 0,
  isPaused: true,
  turnId: 0,
  movesRemaining: TURN_MOVE_CAP,
  maxMovesPerTurn: TURN_MOVE_CAP,
  turnStartedAt: null,
})

const initialState = createInitialTurnTimerSnapshot()

export const useTurnTimerStore = create<TurnTimerStore>((set, get) => ({
  ...initialState,
  startTimer: (durationSeconds) =>
    set((state) => ({
      secondsRemaining: durationSeconds,
      isPaused: false,
      turnId: state.turnId + 1,
      movesRemaining: state.maxMovesPerTurn,
      turnStartedAt: Date.now(),
    })),
  tick: () =>
    set((state) => {
      if (state.isPaused || state.secondsRemaining <= 0) {
        return state
      }

      /** TODO: Emit events for overtime/turn transitions once networking lands. */
      const secondsRemaining = Math.max(0, state.secondsRemaining - 1)
      if (secondsRemaining === 0) {
        return {
          ...state,
          secondsRemaining,
          turnId: state.turnId + 1,
          movesRemaining: state.maxMovesPerTurn,
          turnStartedAt: Date.now(),
        }
      }
      return {
        ...state,
        secondsRemaining,
      }
    }),
  pause: () => set((state) => ({ ...state, isPaused: true })),
  resume: () =>
    set((state) => ({
      ...state,
      isPaused: false,
    })),
  reset: () => set(createInitialTurnTimerSnapshot()),
  startNextTurn: (durationSeconds) =>
    set((state) => ({
      ...state,
      secondsRemaining: durationSeconds ?? state.secondsRemaining,
      turnId: state.turnId + 1,
      movesRemaining: state.maxMovesPerTurn,
      isPaused: false,
      turnStartedAt: Date.now(),
    })),
  canScheduleMove: () => get().movesRemaining > 0,
  consumeMove: () => {
    const state = get()
    if (state.movesRemaining <= 0) {
      return false
    }
    set({ movesRemaining: state.movesRemaining - 1 })
    return true
  },
  resetMoveBudget: () =>
    set((state) => ({
      ...state,
      movesRemaining: state.maxMovesPerTurn,
    })),
}))

export const selectIsTimerExpired = (state: TurnTimerStore): boolean =>
  state.secondsRemaining === 0 && !state.isPaused

export const selectTimerSnapshot = (
  state: TurnTimerStore,
): Pick<TurnTimerStore, 'secondsRemaining' | 'isPaused'> => ({
  secondsRemaining: state.secondsRemaining,
  isPaused: state.isPaused,
})

export const selectSecondsRemaining = (state: TurnTimerStore): number =>
  state.secondsRemaining

export const selectIsTimerPaused = (state: TurnTimerStore): boolean => state.isPaused

export const selectMovesRemaining = (state: TurnTimerStore): number => state.movesRemaining
