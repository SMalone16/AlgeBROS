export interface PlayerProfile {
  id: string
  codename: string
  /** TODO: Track unlocked operators, difficulty tiers, and alliance metadata. */
  loadout?: string[]
}

export interface ShipMotionState {
  status: 'idle' | 'inFlight'
  destination: { x: number; y: number } | null
  speed: number
  startedAt: number | null
  eta: number | null
  distanceRemaining: number
  totalDistance: number
}

export interface ShipModel {
  id: string
  ownerId: string
  position: { x: number; y: number }
  localFrameOrigin: { x: number; y: number }
  accumulatedDistance: number
  motionState: ShipMotionState
  /** TODO: Extend with velocity, health, cargo, and algebraic cooldown stats. */
}

export interface TurnTimerSnapshot {
  secondsRemaining: number
  isPaused: boolean
  turnId: number
  movesRemaining: number
  maxMovesPerTurn: number
  turnStartedAt: number | null
  /** TODO: Add fields for phase transitions and overtime handling. */
}
