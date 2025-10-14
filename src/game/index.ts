import { evaluateExpression, generateEquationForTerritory } from '../math'
import { useShipStore } from '../state/shipStore'
import type { ShipStore } from '../state/shipStore'

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
  message: string
}

export type MovementResult = MovementSuccess | MovementFailure

const sanitizeExpression = (expression: string): string => expression.replace(/\s+/g, '')

const containsInvalidTokens = (expression: string): boolean => /[^0-9+\-*/^()]/.test(expression)

export const movementResolver = (
  submission: MovementSubmission,
  dependencies: MovementResolverDependencies = {},
): MovementResult => {
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

  const destinationX = submission.origin.x + evaluated
  const destinationY = submission.origin.y

  if (
    destinationX < 0 ||
    destinationX >= BOARD_COLUMNS ||
    destinationY < 0 ||
    destinationY >= BOARD_ROWS
  ) {
    return {
      success: false,
      shipId: submission.shipId,
      ownerId: submission.ownerId,
      difficulty,
      errorCode: 'OUT_OF_BOUNDS',
      message: 'Computed trajectory exits the tactical grid.',
    }
  }

  const updateShipPosition =
    dependencies.updateShipPosition ?? useShipStore.getState().updateShipPosition

  const destination = { x: destinationX, y: destinationY }
  updateShipPosition(submission.shipId, destination)

  return {
    success: true,
    shipId: submission.shipId,
    ownerId: submission.ownerId,
    difficulty,
    origin: submission.origin,
    destination,
    delta: { x: evaluated, y: 0 },
    evaluated,
    message: 'Trajectory resolved and ship position updated.',
  }
}
