import { create } from 'zustand'
import type { PlayerProfile } from '../types'

export interface PlayerStore {
  players: PlayerProfile[]
  activePlayerId: string | null
  /** TODO: Cache leaderboard metadata once scoring is implemented. */
  leaderboardSnapshot: Record<string, number> | null
  setPlayers: (players: PlayerProfile[]) => void
  setActivePlayer: (playerId: string | null) => void
  /** TODO: Track alliance-wide bonuses to support team scoreboards. */
  setLeaderboardSnapshot: (scores: Record<string, number> | null) => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  players: [],
  activePlayerId: null,
  leaderboardSnapshot: null,
  setPlayers: (players) => set({ players }),
  setActivePlayer: (playerId) => set({ activePlayerId: playerId }),
  setLeaderboardSnapshot: (scores) => set({ leaderboardSnapshot: scores }),
}))

export const selectActivePlayer = (state: PlayerStore): PlayerProfile | null => {
  /** TODO: Cross-reference alliance buffs and ship status for the HUD. */
  return state.players.find((player) => player.id === state.activePlayerId) ?? null
}

export const selectPlayers = (state: PlayerStore): PlayerProfile[] => state.players

export const selectActivePlayerId = (state: PlayerStore): string | null =>
  state.activePlayerId
