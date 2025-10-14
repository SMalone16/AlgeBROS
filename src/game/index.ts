export interface BoardStateCell {
  id: string
  /** TODO: Extend with algebraic metadata (operators, operands, victory points, etc.). */
  terrainType?: string
  occupantId?: string | null
}

export type BoardState = BoardStateCell[][]

export const initializeBoard = (): BoardState => {
  /**
   * TODO: Replace placeholder board with procedurally generated tiles once the
   * MVP spec defines grid sizing and algebraic challenges per territory.
   */
  return [] as BoardState
}

export const territoryManager = (): void => {
  /**
   * TODO: Orchestrate capture logic, resolve contested areas, and feed
   * real-time updates to the UI and scoring subsystems.
   */
  throw new Error('territoryManager is not implemented yet.')
}

export const movementResolver = (): void => {
  /**
   * TODO: Validate algebraic move submissions, compute resulting ship paths,
   * and hand off successful results to the ship store/state synchronizer.
   */
  throw new Error('movementResolver is not implemented yet.')
}
