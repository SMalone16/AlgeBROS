import { evaluateExpression, generateEquationForTerritory } from '../math'
import { useShipStore } from '../state/shipStore'
import type { ShipStore } from '../state/shipStore'
import { useTurnTimerStore } from '../state/timerStore'
import type { TurnTimerStore } from '../state/timerStore'
import { usePlayerStore, type LeaderboardSnapshot } from '../state/playerStore'

export const BOARD_COLUMNS = 16
export const BOARD_ROWS = 12

export const ARENA_WIDTH = 64
export const ARENA_HEIGHT = 64
const DISTANCE_COEFFICIENT = 8
const SHIP_TRAVEL_SPEED = 4

export type TerrainType =
  | 'open'
  | 'nebula'
  | 'asteroid'
  | 'warpGate'
  | 'relic'

export type EquationDifficulty = 'easy' | 'medium' | 'hard'

export const THRUST_COEFFICIENT = 8

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

export interface TerritoryManagerOptions {
  board?: BoardState
  persist?: boolean
}

export interface ContestedRegionSummary extends LeaderboardSnapshot['contestedRegions'][number] {}

export interface TerritoryManagerResult {
  scores: Record<string, number>
  contestedRegions: ContestedRegionSummary[]
  resolvedAt: number
}

const neighborOffsets = [
  { row: -1, column: 0 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
  { row: 0, column: 1 },
]

export const territoryManager = (
  options: TerritoryManagerOptions = {},
): TerritoryManagerResult => {
  const board = options.board ?? initializeBoard()
  const { shipList } = useShipStore.getState()
  const { players, setLeaderboardSnapshot } = usePlayerStore.getState()

  board.forEach((row) => {
    row.forEach((cell) => {
      cell.occupantId = null
    })
  })

  const occupiedCells = new Map<
    string,
    {
      owners: Set<string>
      shipIds: string[]
      cell: BoardStateCell
    }
  >()

  shipList.forEach((ship) => {
    const row = ship.position.y
    const column = ship.position.x
    const boardRow = board[row]
    if (!boardRow) {
      return
    }
    const cell = boardRow[column]
    if (!cell || cell.isObstacle) {
      return
    }

    const key = `${row}-${column}`
    let entry = occupiedCells.get(key)
    if (!entry) {
      entry = { owners: new Set(), shipIds: [], cell }
      occupiedCells.set(key, entry)
    }
    entry.owners.add(ship.ownerId)
    entry.shipIds.push(ship.id)
  })

  const visited = new Set<string>()
  const contestedCells = new Set<string>()
  const contestedRegions: ContestedRegionSummary[] = []
  const scoreMap = new Map<string, number>()

  const getNeighbors = (cell: BoardStateCell): string[] =>
    neighborOffsets
      .map(({ row: deltaRow, column: deltaColumn }) => ({
        row: cell.row + deltaRow,
        column: cell.column + deltaColumn,
      }))
      .filter(({ row, column }) => occupiedCells.has(`${row}-${column}`))
      .map(({ row, column }) => `${row}-${column}`)

  occupiedCells.forEach((entry, key) => {
    if (visited.has(key)) {
      return
    }

    const componentCells: BoardStateCell[] = []
    const owners = new Set<string>()
    let contested = entry.owners.size > 1
    const queue: string[] = [key]
    let queueIndex = 0
    visited.add(key)

    while (queueIndex < queue.length) {
      const currentKey = queue[queueIndex]
      queueIndex += 1
      const currentEntry = occupiedCells.get(currentKey)
      if (!currentEntry) {
        continue
      }

      componentCells.push(currentEntry.cell)
      currentEntry.owners.forEach((owner) => owners.add(owner))
      if (currentEntry.owners.size > 1) {
        contested = true
      }

      getNeighbors(currentEntry.cell).forEach((neighborKey) => {
        if (visited.has(neighborKey)) {
          return
        }
        visited.add(neighborKey)
        queue.push(neighborKey)
      })
    }

    if (owners.size > 1) {
      contested = true
    }

    if (contested) {
      componentCells.forEach((cell) => {
        contestedCells.add(`${cell.row}-${cell.column}`)
      })
      contestedRegions.push({
        owners: Array.from(owners).sort(),
        cells: componentCells.map((cell) => ({ row: cell.row, column: cell.column })),
        cellCount: componentCells.length,
      })
      return
    }

    const ownerId = owners.values().next().value as string | undefined
    if (!ownerId) {
      return
    }
    scoreMap.set(ownerId, (scoreMap.get(ownerId) ?? 0) + componentCells.length)
  })

  occupiedCells.forEach((entry, key) => {
    if (contestedCells.has(key)) {
      entry.cell.occupantId = null
      return
    }

    if (entry.owners.size === 1) {
      entry.cell.occupantId = entry.shipIds[0] ?? null
    } else {
      entry.cell.occupantId = null
    }
  })

  const scores: Record<string, number> = {}
  players.forEach((player) => {
    scores[player.id] = scoreMap.get(player.id) ?? 0
  })
  scoreMap.forEach((value, ownerId) => {
    if (!(ownerId in scores)) {
      scores[ownerId] = value
    }
  })

  const resolvedAt = Date.now()

  const summary: TerritoryManagerResult = {
    scores,
    contestedRegions,
    resolvedAt,
  }

  if (options.persist !== false) {
    const snapshot: LeaderboardSnapshot = {
      scores,
      contestedRegions,
      resolvedAt,
    }
    setLeaderboardSnapshot(snapshot)
  }

  return summary
}

const OPERATOR_PATTERN = /[+\-*/^]/g

const DIFFICULTY_RULES: Record<
  EquationDifficulty,
  { allowedOperators: Set<string>; maxThrust: number }
> = {
  easy: { allowedOperators: new Set(['+', '-']), maxThrust: 5 },
  medium: { allowedOperators: new Set(['+', '-', '*']), maxThrust: 10 },
  hard: { allowedOperators: new Set(['+', '-', '*', '/', '^']), maxThrust: 16 },
}

export interface MovementSubmission {
  shipId: string
  ownerId: string
  origin: { x: number; y: number }
  expression: string
  difficulty: EquationDifficulty
}

export interface MovementResolverDependencies {
  updateShipPosition?: ShipStore['updateShipPosition']
  timerStore?: Pick<TurnTimerStore, 'canScheduleMove' | 'consumeMove'>
  shipState?: Pick<ShipStore, 'ships'>
  now?: () => number
}

interface BaseMovementResult {
  shipId: string
  ownerId: string
  difficulty: EquationDifficulty
}

export interface MovementSuccess extends BaseMovementResult {
  success: true
  origin: MovementSubmission['origin']
  destination: MovementSubmission['origin']
  delta: { x: number; y: number }
  evaluated: number
  durationSeconds: number
  speed: number
  message: string
}

export interface MovementFailure extends BaseMovementResult {
  success: false
  errorCode:
    | 'UNKNOWN_DIFFICULTY'
    | 'INVALID_TOKEN'
    | 'OPERATOR_NOT_ALLOWED'
    | 'EMPTY_EXPRESSION'
    | 'EVALUATION_ERROR'
    | 'NON_NUMERIC_RESULT'
    | 'NON_INTEGER_RESULT'
    | 'THRUST_LIMIT_EXCEEDED'
    | 'OUT_OF_BOUNDS'
    | 'MOVE_BUDGET_EXHAUSTED'
  message: string
}

export type MovementResult = MovementSuccess | MovementFailure

const sanitizeExpression = (expression: string): string => expression.replace(/\s+/g, '')

const containsInvalidTokens = (expression: string): boolean => /[^0-9+\-*/^()]/.test(expression)

export const resolveMovementSubmission = (submission: MovementSubmission): MovementResult => {
  const { difficulty, expression } = submission
  const rules = DIFFICULTY_RULES[difficulty]

  if (!rules) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'UNKNOWN_DIFFICULTY',
      message: `Difficulty tier "${difficulty}" is not recognized.`,
    }
  }

  const trimmedExpression = sanitizeExpression(expression)
  if (!trimmedExpression) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'EMPTY_EXPRESSION',
      message: 'An algebraic expression is required to resolve movement.',
    }
  }

  if (containsInvalidTokens(trimmedExpression)) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'INVALID_TOKEN',
      message: 'Expression contains unsupported characters.',
    }
  }

  const operators = trimmedExpression.match(OPERATOR_PATTERN) ?? []
  const disallowedOperator = operators.find((operator) => !rules.allowedOperators.has(operator))

  if (disallowedOperator) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'OPERATOR_NOT_ALLOWED',
      message: `Operator "${disallowedOperator}" is not permitted at the ${difficulty} tier.`,
    }
  }

  let evaluated: number
  try {
    evaluated = evaluateExpression(expression)
  } catch (error) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'EVALUATION_ERROR',
      message: error instanceof Error ? error.message : 'Unable to evaluate expression.',
    }
  }

  if (!Number.isFinite(evaluated)) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'NON_NUMERIC_RESULT',
      message: 'Expression must resolve to a finite numeric value.',
    }
  }

  if (!Number.isInteger(evaluated)) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'NON_INTEGER_RESULT',
      message: 'Fractional thrust values are not supported for ship movement.',
    }
  }

  const thrust = Math.abs(evaluated)
  if (thrust > rules.maxThrust) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'THRUST_LIMIT_EXCEEDED',
      message: `Result exceeds the ${difficulty} thrust limit of ${rules.maxThrust}.`,
    }
  }

  const turnTimer =
    dependencies.timerStore ?? useTurnTimerStore.getState()

  if (!turnTimer.canScheduleMove()) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'MOVE_BUDGET_EXHAUSTED',
      message: 'Turn move budget exhausted. Await the next initiative window.',
    }
  }

  if (!turnTimer.consumeMove()) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'MOVE_BUDGET_EXHAUSTED',
      message: 'Turn move budget exhausted. Await the next initiative window.',
    }
  }

  const shipState = dependencies.shipState ?? useShipStore.getState()
  const existing = shipState.ships[submission.shipId]
  const currentPosition = existing?.position ?? submission.origin
  const frameOrigin =
    existing && existing.motionState.status === 'inFlight'
      ? existing.localFrameOrigin
      : { ...currentPosition }

  const scaledDelta = evaluated * DISTANCE_COEFFICIENT
  const proposedDestination = {
    x: frameOrigin.x + scaledDelta,
    y: frameOrigin.y,
  }

  const clamp = (value: number, max: number): number =>
    Math.min(Math.max(value, 0), max - 1)

  const destination = {
    x: clamp(proposedDestination.x, ARENA_WIDTH),
    y: clamp(proposedDestination.y, ARENA_HEIGHT),
  }

  const delta = {
    x: destination.x - currentPosition.x,
    y: destination.y - currentPosition.y,
  }

  const distanceMagnitude = Math.hypot(delta.x, delta.y)
  const now = dependencies.now?.() ?? Date.now()
  const durationSeconds = distanceMagnitude / SHIP_TRAVEL_SPEED

  const motionState = distanceMagnitude
    ? {
        status: 'inFlight' as const,
        destination,
        speed: SHIP_TRAVEL_SPEED,
        startedAt: now,
        eta: now + durationSeconds * 1000,
        distanceRemaining: distanceMagnitude,
        totalDistance: distanceMagnitude,
      }
    : {
        status: 'idle' as const,
        destination: null,
        speed: 0,
        startedAt: null,
        eta: null,
        distanceRemaining: 0,
        totalDistance: 0,
      }

  const updateShipPosition =
    dependencies.updateShipPosition ?? useShipStore.getState().updateShipPosition

  const persistedPosition = existing?.position ?? submission.origin

  updateShipPosition(submission.shipId, persistedPosition, {
    ownerId: submission.ownerId,
    frameOrigin,
    distanceDelta: distanceMagnitude,
    motionState,
    resetFrame: motionState.status === 'idle',
  })

  return {
    success: true,
    shipId: submission.shipId,
    ownerId: submission.ownerId,
    difficulty,
    origin: currentPosition,
    destination,
    delta,
    evaluated,
    durationSeconds,
    speed: SHIP_TRAVEL_SPEED,
    message: 'Trajectory scheduled for execution.',
    message: 'Trajectory resolved.',
  }
}

export const movementResolver = (
  submission: MovementSubmission,
  dependencies: MovementResolverDependencies = {},
): MovementResult => {
  const result = resolveMovementSubmission(submission)

  if (!result.success) {
    return result
  }

  const updateShipPosition =
    dependencies.updateShipPosition ?? useShipStore.getState().updateShipPosition

  updateShipPosition(submission.shipId, result.destination)

  return {
    ...result,
    message: 'Trajectory resolved and ship position updated.',
  }
}
