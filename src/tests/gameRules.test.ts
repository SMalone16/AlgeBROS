import { beforeEach, describe, expect, test, vi } from 'vitest'

import { movementResolver } from '../game'
import { useShipStore } from '../state/shipStore'

describe('Game Rules', () => {
  beforeEach(() => {
    useShipStore.setState({ ships: {}, shipList: [] })
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
    expect(result.destination).toEqual({ x: 6, y: 4 })
    expect(updateShipPosition).toHaveBeenCalledWith('scout-7', { x: 6, y: 4 })
    expect(result.delta).toEqual({ x: 3, y: 0 })
    expect(result.evaluated).toBe(3)
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
  })

  test('partial updates do not fabricate unknown owners', () => {
    const existingShip = { id: 'alpha-1', ownerId: 'alpha', position: { x: 0, y: 0 } }
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
})
