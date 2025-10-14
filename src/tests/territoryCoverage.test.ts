import { beforeEach, describe, expect, test, vi } from 'vitest'

import { initializeBoard, territoryManager } from '../game'
import { usePlayerStore } from '../state/playerStore'
import { useShipStore } from '../state/shipStore'

const resetStores = () => {
  usePlayerStore.setState({ players: [], activePlayerId: null, leaderboardSnapshot: null })
  useShipStore.setState({ ships: {}, shipList: [] })
}

describe('Territory Coverage', () => {
  beforeEach(() => {
    resetStores()
  })

  test('scores contiguous regions using the territoryManager once available', () => {
    const board = initializeBoard()
    usePlayerStore.setState((state) => ({
      ...state,
      players: [
        { id: 'alpha', codename: 'Commander Alpha' },
        { id: 'beta', codename: 'Navigator Beta' },
      ],
      activePlayerId: 'alpha',
    }))
    useShipStore.setState((state) => {
      const ships = {
        'ship-a1': { id: 'ship-a1', ownerId: 'alpha', position: { x: 2, y: 2 } },
        'ship-a2': { id: 'ship-a2', ownerId: 'alpha', position: { x: 2, y: 3 } },
        'ship-b1': { id: 'ship-b1', ownerId: 'beta', position: { x: 7, y: 5 } },
      }
      return {
        ...state,
        ships,
        shipList: Object.values(ships),
      }
    })

    const summary = territoryManager({ board })

    expect(summary.scores).toEqual({ alpha: 2, beta: 1 })
    expect(summary.contestedRegions).toHaveLength(0)
    expect(summary.resolvedAt).toBeGreaterThan(0)

    const leaderboard = usePlayerStore.getState().leaderboardSnapshot
    expect(leaderboard?.scores).toEqual({ alpha: 2, beta: 1 })
    expect(leaderboard?.contestedRegions).toHaveLength(0)
  })

  test('marks mixed-owner clusters as contested territories', () => {
    const board = initializeBoard()
    usePlayerStore.setState((state) => ({
      ...state,
      players: [
        { id: 'alpha', codename: 'Commander Alpha' },
        { id: 'beta', codename: 'Navigator Beta' },
      ],
      activePlayerId: 'alpha',
    }))
    useShipStore.setState((state) => {
      const ships = {
        'ship-a1': { id: 'ship-a1', ownerId: 'alpha', position: { x: 4, y: 4 } },
        'ship-b1': { id: 'ship-b1', ownerId: 'beta', position: { x: 4, y: 5 } },
      }
      return {
        ...state,
        ships,
        shipList: Object.values(ships),
      }
    })

    const summary = territoryManager({ board })

    expect(summary.scores).toEqual({ alpha: 0, beta: 0 })
    expect(summary.contestedRegions).toHaveLength(1)
    expect(summary.contestedRegions[0]?.owners.sort()).toEqual(['alpha', 'beta'])
    expect(summary.contestedRegions[0]?.cellCount).toBe(2)

    const contestedCell = board[4][4]
    expect(contestedCell.occupantId).toBeNull()
  })

  test('syncs board control updates with the player and ship stores', () => {
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
    useShipStore.setState((state) => {
      const ships = {
        'ship-a1': { id: 'ship-a1', ownerId: 'alpha', position: { x: 1, y: 1 } },
        'ship-b1': { id: 'ship-b1', ownerId: 'beta', position: { x: 6, y: 6 } },
      }
      return {
        ...state,
        ships,
        shipList: Object.values(ships),
      }
    })

    const firstSummary = territoryManager({ board })
    expect(firstSummary.scores).toEqual({ alpha: 1, beta: 1 })
    expect(board[1][1].occupantId).toBe('ship-a1')

    vi.setSystemTime(new Date('2042-01-01T00:05:00Z'))
    useShipStore.setState((state) => {
      const ships = {
        'ship-a1': { id: 'ship-a1', ownerId: 'alpha', position: { x: 1, y: 1 } },
        'ship-a2': { id: 'ship-a2', ownerId: 'alpha', position: { x: 1, y: 2 } },
        'ship-b1': { id: 'ship-b1', ownerId: 'beta', position: { x: 6, y: 6 } },
      }
      return {
        ...state,
        ships,
        shipList: Object.values(ships),
      }
    })

    const updatedSummary = territoryManager({ board })
    expect(updatedSummary.scores).toEqual({ alpha: 2, beta: 1 })
    expect(updatedSummary.resolvedAt).toBeGreaterThan(firstSummary.resolvedAt)

    const leaderboard = usePlayerStore.getState().leaderboardSnapshot
    expect(leaderboard?.scores).toEqual({ alpha: 2, beta: 1 })
    expect(leaderboard?.resolvedAt).toBe(updatedSummary.resolvedAt)

    vi.useRealTimers()
  })
})
