export interface PlayerProfile {
  id: string
  codename: string
  /** TODO: Track unlocked operators, difficulty tiers, and alliance metadata. */
  loadout?: string[]
}

export interface ShipModel {
  id: string
  ownerId: string
  position: { x: number; y: number }
  /** TODO: Extend with velocity, health, cargo, and algebraic cooldown stats. */
}

export interface TurnTimerSnapshot {
  secondsRemaining: number
  isPaused: boolean
  /** TODO: Add fields for phase transitions and overtime handling. */
}
