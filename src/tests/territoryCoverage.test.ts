import { beforeEach, describe, expect, test, vi } from 'vitest'

import { initializeBoard, territoryManager } from '../game'
import { usePlayerStore } from '../state/playerStore'
import { useShipStore } from '../state/shipStore'
import type { ShipModel, ShipTurnTrail, Vector2 } from '../types'

const resetStores = () => {
  usePlayerStore.setState({ players: [], activePlayerId: null, leaderboardSnapshot: null })
  useShipStore.setState({ ships: {}, shipList: [] })
}

const createMotionlessState = () => ({
  status: 'idle' as const,
  destination: null,
  speed: 0,
  startedAt: null,
  eta: null,
  distanceRemaining: 0,
  totalDistance: 0,
})

const createSquareTrail = (
  turnId: number,
  origin: Vector2,
  size: number,
  timestamp: number,
): ShipTurnTrail => {
  const vertices: Vector2[] = [
    { x: origin.x, y: origin.y },
    { x: origin.x + size, y: origin.y },
    { x: origin.x + size, y: origin.y + size },
    { x: origin.x, y: origin.y + size },
  ]

  const segments = vertices.map((start, index) => {
    const end = vertices[(index + 1) % vertices.length]
    return {
      start,
      end,
      completedAt: timestamp + index + 1,
    }
  })

  return {
    turnId,
    startedAt: timestamp,
    updatedAt: timestamp + segments.length,
    segments,
  }
}

const createShip = (overrides: Partial<ShipModel> & Pick<ShipModel, 'id' | 'ownerId' | 'position'>): ShipModel => ({
  id: overrides.id,
  ownerId: overrides.ownerId,
  position: overrides.position,
  localFrameOrigin: overrides.localFrameOrigin ?? { ...overrides.position },
  accumulatedDistance: overrides.accumulatedDistance ?? 0,
  motionState: overrides.motionState ?? createMotionlessState(),
  trailHistory: overrides.trailHistory ?? [],
  territoryPolygons: overrides.territoryPolygons ?? [],
})

describe('Territory Coverage', () => {
  beforeEach(() => {
    resetStores()
  })

  test('scores canonical polygons derived from ship trails', () => {
    const board = initializeBoard()
    usePlayerStore.setState((state) => ({
      ...state,
      players: [
        { id: 'alpha', codename: 'Commander Alpha' },
        { id: 'beta', codename: 'Navigator Beta' },
      ],
      activePlayerId: 'alpha',
    }))

    const alphaTrailOne = createSquareTrail(1, { x: 0, y: 0 }, 1, 1_000)
    const alphaTrailTwo = createSquareTrail(1, { x: 2, y: 0 }, 1, 2_000)
    const betaTrail = createSquareTrail(1, { x: 5, y: 0 }, 1, 3_000)

    useShipStore.getState().setShips([
      createShip({ id: 'ship-a1', ownerId: 'alpha', position: { x: 0, y: 0 }, trailHistory: [alphaTrailOne] }),
      createShip({ id: 'ship-a2', ownerId: 'alpha', position: { x: 2, y: 0 }, trailHistory: [alphaTrailTwo] }),
      createShip({ id: 'ship-b1', ownerId: 'beta', position: { x: 5, y: 0 }, trailHistory: [betaTrail] }),
    ])

    const summary = territoryManager({ board })

    expect(summary.scores).toEqual({ alpha: 2, beta: 1 })
    expect(summary.contestedRegions).toHaveLength(0)
    expect(summary.resolvedAt).toBeGreaterThan(0)

    const shipState = useShipStore.getState()
    expect(shipState.ships['ship-a1']?.territoryPolygons).toHaveLength(1)
    expect(shipState.ships['ship-a2']?.territoryPolygons[0]?.area).toBeCloseTo(1)

    const leaderboard = usePlayerStore.getState().leaderboardSnapshot
    expect(leaderboard?.scores).toEqual({ alpha: 2, beta: 1 })
    expect(leaderboard?.contestedRegions).toHaveLength(0)
  })

  test('records contested overlaps when polygons intersect', () => {
    const board = initializeBoard()
    usePlayerStore.setState((state) => ({
      ...state,
      players: [
        { id: 'alpha', codename: 'Commander Alpha' },
        { id: 'beta', codename: 'Navigator Beta' },
      ],
      activePlayerId: 'alpha',
    }))

    const sharedAlphaTrail = createSquareTrail(2, { x: 4, y: 4 }, 1, 5_000)
    const sharedBetaTrail = createSquareTrail(2, { x: 4.5, y: 4.5 }, 1, 6_000)

    useShipStore.getState().setShips([
      createShip({ id: 'ship-a1', ownerId: 'alpha', position: { x: 4, y: 4 }, trailHistory: [sharedAlphaTrail] }),
      createShip({ id: 'ship-b1', ownerId: 'beta', position: { x: 5, y: 5 }, trailHistory: [sharedBetaTrail] }),
    ])

    const summary = territoryManager({ board })

    expect(summary.scores).toEqual({ alpha: 1, beta: 1 })
    expect(summary.contestedRegions).toHaveLength(1)
    expect(summary.contestedRegions[0]?.owners).toEqual(['alpha', 'beta'])
    expect(summary.contestedRegions[0]?.overlapEstimate).toBeGreaterThan(0)
  })

  test('persists polygon results across scoring runs', () => {
    vi.useFakeTimers()
    const initialTime = new Date('2042-01-01T00:00:00Z')
    vi.setSystemTime(initialTime)

    const board = initializeBoard()
    usePlayerStore.setState((state) => ({
      ...state,
      players: [
        { id: 'alpha', codename: 'Commander Alpha' },
        { id: 'beta', codename: 'Navigator Beta' },
      ],
      activePlayerId: 'beta',
    }))

    const alphaTrail = createSquareTrail(3, { x: 1, y: 1 }, 1, 10_000)
    const betaTrail = createSquareTrail(3, { x: 6, y: 6 }, 1, 11_000)

    useShipStore.getState().setShips([
      createShip({ id: 'ship-a1', ownerId: 'alpha', position: { x: 1, y: 1 }, trailHistory: [alphaTrail] }),
      createShip({ id: 'ship-b1', ownerId: 'beta', position: { x: 6, y: 6 }, trailHistory: [betaTrail] }),
    ])

    const firstSummary = territoryManager({ board })
    expect(firstSummary.scores).toEqual({ alpha: 1, beta: 1 })

    vi.setSystemTime(new Date('2042-01-01T00:05:00Z'))

    const alphaExpansion = createSquareTrail(4, { x: 1, y: 3 }, 1, 20_000)
    useShipStore.getState().setShips([
      createShip({
        id: 'ship-a1',
        ownerId: 'alpha',
        position: { x: 1, y: 3 },
        trailHistory: [...useShipStore.getState().ships['ship-a1']!.trailHistory, alphaExpansion],
        territoryPolygons: useShipStore.getState().ships['ship-a1']!.territoryPolygons,
      }),
      useShipStore.getState().ships['ship-b1']!,
    ])

    const updatedSummary = territoryManager({ board })
    expect(updatedSummary.scores).toEqual({ alpha: 2, beta: 1 })
    expect(updatedSummary.resolvedAt).toBeGreaterThan(firstSummary.resolvedAt)

    const leaderboard = usePlayerStore.getState().leaderboardSnapshot
    expect(leaderboard?.scores).toEqual({ alpha: 2, beta: 1 })
    expect(leaderboard?.resolvedAt).toBe(updatedSummary.resolvedAt)

    vi.useRealTimers()
  })
})
