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

export interface Vector2 {
  x: number
  y: number
}

export interface ShipTrailSegment {
  start: Vector2
  end: Vector2
  completedAt: number
}

export interface ShipTurnTrail {
  turnId: number
  startedAt: number
  updatedAt: number
  segments: ShipTrailSegment[]
}

export interface CanonicalPolygon {
  id: string
  vertices: Vector2[]
  area: number
  perimeter: number
  turnId: number
  finalizedAt: number
}

export interface ShipModel {
  id: string
  ownerId: string
  position: Vector2
  localFrameOrigin: Vector2
  accumulatedDistance: number
  motionState: ShipMotionState
  trailHistory: ShipTurnTrail[]
  territoryPolygons: CanonicalPolygon[]
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
