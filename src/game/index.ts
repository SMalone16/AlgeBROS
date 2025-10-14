import { generateEquationForTerritory } from '../math'

export const BOARD_COLUMNS = 16
export const BOARD_ROWS = 12

export type TerrainType =
  | 'open'
  | 'nebula'
  | 'asteroid'
  | 'warpGate'
  | 'relic'

export type EquationDifficulty = 'easy' | 'medium' | 'hard'

export interface BoardStateCell {
  id: string
  row: number
  column: number
  terrainType: TerrainType
  isSpawnPoint: boolean
  isObjective: boolean
  isObstacle: boolean
  occupantId: string | null
  equationSeed: string
  equationPrompt: string
  equationDifficulty: EquationDifficulty
}

export type BoardState = BoardStateCell[][]

const SPAWN_POINTS = new Set(['0-0', '0-15', '11-0', '11-15'])
const OBJECTIVE_POINTS = new Set(['5-7', '5-8', '6-7', '6-8'])

const determineDifficulty = (row: number): EquationDifficulty => {
  const easyBoundary = Math.floor(BOARD_ROWS / 3)
  const mediumBoundary = Math.floor((BOARD_ROWS * 2) / 3)

  if (row < easyBoundary) {
    return 'easy'
  }

  if (row < mediumBoundary) {
    return 'medium'
  }

  return 'hard'
}

const determineTerrain = (
  row: number,
  column: number,
  isSpawn: boolean,
  isObjective: boolean,
): TerrainType => {
  if (isSpawn) {
    return 'warpGate'
  }

  if (isObjective) {
    return 'relic'
  }

  if ((row + column) % 7 === 0) {
    return 'asteroid'
  }

  if ((row * column) % 5 === 0) {
    return 'nebula'
  }

  return 'open'
}

export const initializeBoard = (): BoardState => {
  const board: BoardState = []

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    const boardRow: BoardStateCell[] = []

    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const id = `r${row}-c${column}`
      const locationKey = `${row}-${column}`
      const isSpawnPoint = SPAWN_POINTS.has(locationKey)
      const isObjective = OBJECTIVE_POINTS.has(locationKey)
      const terrainType = determineTerrain(row, column, isSpawnPoint, isObjective)
      const equationSeed = `${id}:${terrainType}`
      const equationPrompt = generateEquationForTerritory(equationSeed)

      boardRow.push({
        id,
        row,
        column,
        terrainType,
        isSpawnPoint,
        isObjective,
        isObstacle: terrainType === 'asteroid',
        occupantId: null,
        equationSeed,
        equationPrompt,
        equationDifficulty: determineDifficulty(row),
      })
    }

    board.push(boardRow)
  }

  return board
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
