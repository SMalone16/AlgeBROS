import { create } from 'zustand'
import type { PlayerProfile } from '../types'

export interface ContestedRegionSnapshot {
  owners: string[]
  cells: Array<{ row: number; column: number }>
  cellCount: number
}

export interface LeaderboardSnapshot {
  scores: Record<string, number>
  contestedRegions: ContestedRegionSnapshot[]
  resolvedAt: number
}

export interface PlayerStore {
  players: PlayerProfile[]
  activePlayerId: string | null
  /** TODO: Cache leaderboard metadata once scoring is implemented. */
  leaderboardSnapshot: LeaderboardSnapshot | null
  setPlayers: (players: PlayerProfile[]) => void
  setActivePlayer: (playerId: string | null) => void
  /** TODO: Track alliance-wide bonuses to support team scoreboards. */
  setLeaderboardSnapshot: (snapshot: LeaderboardSnapshot | null) => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  players: [],
  activePlayerId: null,
  leaderboardSnapshot: null,
  setPlayers: (players) => set({ players }),
  setActivePlayer: (playerId) => set({ activePlayerId: playerId }),
  setLeaderboardSnapshot: (snapshot) => set({ leaderboardSnapshot: snapshot }),
}))

export const selectActivePlayer = (state: PlayerStore): PlayerProfile | null => {
  /** TODO: Cross-reference alliance buffs and ship status for the HUD. */
  return state.players.find((player) => player.id === state.activePlayerId) ?? null
}

export const selectPlayers = (state: PlayerStore): PlayerProfile[] => state.players

export const selectActivePlayerId = (state: PlayerStore): string | null =>
  state.activePlayerId
