import { beforeEach, describe, expect, it } from 'vitest'

import { detectDockingContact, movementResolver } from '../game'
import { useDockMenuStore } from '../state/dockMenuStore'
import { useShipStore } from '../state/shipStore'
import { createInitialTurnTimerSnapshot, useTurnTimerStore } from '../state/timerStore'

const resetDockMenuStore = () => {
  useDockMenuStore.setState({
    isOpen: false,
    context: null,
    lastExitReason: null,
    lastClosedAt: null,
  })
}

describe('Docking detection', () => {
  beforeEach(() => {
    useShipStore.setState({ ships: {}, shipList: [] })
    useTurnTimerStore.setState(createInitialTurnTimerSnapshot())
    resetDockMenuStore()
  })

  it('detects intersection with dock geometry along the path', () => {
    const contact = detectDockingContact({ x: 6, y: 5 }, { x: 12, y: 5 })

    expect(contact).toBeTruthy()
    if (!contact) {
      throw new Error('Expected docking contact when traversing dock geometry')
    }

    expect(contact.dockId).toBe('central-research-dock')
    expect(['intersection', 'snap']).toContain(contact.contactType)
  })

  it('pauses the timer and opens the dock menu when docking occurs', () => {
    useTurnTimerStore.setState({
      secondsRemaining: 18,
      isPaused: false,
      turnId: 1,
      movesRemaining: 3,
      maxMovesPerTurn: 3,
      turnStartedAt: Date.now(),
    })

    const result = movementResolver({
      shipId: 'dock-runner',
      ownerId: 'captain-a',
      origin: { x: 6, y: 5 },
      expression: '1 + 1',
      difficulty: 'easy',
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('Expected successful docking move')
    }

    expect(result.dockingContact).not.toBeNull()

    const dockState = useDockMenuStore.getState()
    expect(dockState.isOpen).toBe(true)
    expect(dockState.context?.shipId).toBe('dock-runner')
    expect(useTurnTimerStore.getState().isPaused).toBe(true)

    useDockMenuStore.getState().confirmDocking()
    expect(useDockMenuStore.getState().isOpen).toBe(false)
    expect(useTurnTimerStore.getState().isPaused).toBe(false)
    expect(useDockMenuStore.getState().lastExitReason).toBe('confirmed')
  })

  it('resumes only if the timer was running prior to docking', () => {
    useTurnTimerStore.setState({
      secondsRemaining: 22,
      isPaused: true,
      turnId: 4,
      movesRemaining: 3,
      maxMovesPerTurn: 3,
      turnStartedAt: Date.now(),
    })

    const result = movementResolver({
      shipId: 'silent-runner',
      ownerId: 'captain-b',
      origin: { x: 6, y: 5 },
      expression: '1 + 1',
      difficulty: 'easy',
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('Expected successful docking move for paused timer scenario')
    }

    useDockMenuStore.getState().dismissDockMenu()

    expect(useTurnTimerStore.getState().isPaused).toBe(true)
    expect(useDockMenuStore.getState().lastExitReason).toBe('dismissed')
  })
})
