import { beforeEach, describe, expect, test, vi } from 'vitest'

import { movementResolver } from '../game'
import { useShipStore } from '../state/shipStore'
import { createInitialTurnTimerSnapshot, useTurnTimerStore } from '../state/timerStore'

describe('Game Rules', () => {
  beforeEach(() => {
    useShipStore.setState({ ships: {}, shipList: [] })
    useTurnTimerStore.setState(createInitialTurnTimerSnapshot())
  })

  test('valid moves update positions within the tactical grid', () => {
    const updateShipPosition = vi.fn()

    const result = movementResolver(
      {
        shipId: 'scout-7',
        ownerId: 'player-1',
        origin: { x: 3, y: 4 },
        expression: '2 + 1',
        difficulty: 'easy',
      },
      { updateShipPosition },
    )

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('Expected successful resolution')
    }
    expect(result.destination).toEqual({ x: 27, y: 4 })
    expect(result.delta).toEqual({ x: 24, y: 0 })
    expect(result.evaluated).toBe(3)
    expect(result.durationSeconds).toBeCloseTo(6)
    expect(result.speed).toBe(4)

    expect(updateShipPosition).toHaveBeenCalledTimes(1)
    const [shipId, persistedPosition, options] = updateShipPosition.mock.calls[0]
    expect(shipId).toBe('scout-7')
    expect(persistedPosition).toEqual({ x: 3, y: 4 })
    expect(options).toMatchObject({
      ownerId: 'player-1',
      frameOrigin: { x: 3, y: 4 },
      distanceDelta: 24,
      resetFrame: false,
    })
    expect(options?.motionState).toMatchObject({
      status: 'inFlight',
      destination: { x: 27, y: 4 },
      speed: 4,
      distanceRemaining: 24,
      totalDistance: 24,
    })
    expect(typeof options?.motionState?.startedAt).toBe('number')
    expect(typeof options?.motionState?.eta).toBe('number')

    expect(useTurnTimerStore.getState().movesRemaining).toBe(2)
  })

  test('illegal algebra inputs are rejected with descriptive errors', () => {
    const updateShipPosition = vi.fn()

    const result = movementResolver(
      {
        shipId: 'frigate-5',
        ownerId: 'player-2',
        origin: { x: 5, y: 5 },
        expression: '2 * 3',
        difficulty: 'easy',
      },
      { updateShipPosition },
    )

    expect(result.success).toBe(false)
    if (result.success) {
      throw new Error('Expected move rejection')
    }
    expect(result.errorCode).toBe('OPERATOR_NOT_ALLOWED')
    expect(updateShipPosition).not.toHaveBeenCalled()
    expect(useTurnTimerStore.getState().movesRemaining).toBe(3)
  })

  test('partial updates do not fabricate unknown owners', () => {
    const existingShip = {
      id: 'alpha-1',
      ownerId: 'alpha',
      position: { x: 0, y: 0 },
      localFrameOrigin: { x: 0, y: 0 },
      accumulatedDistance: 0,
      motionState: {
        status: 'idle',
        destination: null,
        speed: 0,
        startedAt: null,
        eta: null,
        distanceRemaining: 0,
        totalDistance: 0,
      },
    }
    useShipStore.setState({
      ships: { [existingShip.id]: existingShip },
      shipList: [existingShip],
    })

    const result = movementResolver({
      shipId: 'ghost-ship',
      ownerId: 'alpha',
      origin: { x: 0, y: 0 },
      expression: '4 / 2 - 1',
      difficulty: 'easy',
    })

    expect(result.success).toBe(false)
    if (result.success) {
      throw new Error('Expected move rejection')
    }
    expect(result.errorCode).toBe('OPERATOR_NOT_ALLOWED')

    const state = useShipStore.getState()
    expect(state.ships).toHaveProperty(existingShip.id)
    expect(state.shipList).toHaveLength(1)
    expect(state.ships).not.toHaveProperty('ghost-ship')
    const fabricatedOwners = Object.values(state.ships).filter((ship) => ship.ownerId === 'unknown')
    expect(fabricatedOwners).toHaveLength(0)
  })

  test('movement requests respect the per-turn move budget', () => {
    useTurnTimerStore.setState({ movesRemaining: 0 })

    const result = movementResolver({
      shipId: 'beta-7',
      ownerId: 'player-omega',
      origin: { x: 1, y: 1 },
      expression: '1 + 1',
      difficulty: 'easy',
    })

    expect(result.success).toBe(false)
    if (result.success) {
      throw new Error('Expected move budget guard to reject the request')
    }
    expect(result.errorCode).toBe('MOVE_BUDGET_EXHAUSTED')
    expect(useTurnTimerStore.getState().movesRemaining).toBe(0)
  })
})
