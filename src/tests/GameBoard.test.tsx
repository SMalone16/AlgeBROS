import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, act } from '@testing-library/react'
import { GameBoard } from '../components/GameBoard'
import {
  usePlayerStore,
  useShipStore,
  useTurnTimerStore,
} from '../state'
import { BOARD_COLUMNS, BOARD_ROWS } from '../game'

type MockedContext = CanvasRenderingContext2D & {
  clearRect: ReturnType<typeof vi.fn>
  fillRect: ReturnType<typeof vi.fn>
  strokeRect: ReturnType<typeof vi.fn>
  beginPath: ReturnType<typeof vi.fn>
  arc: ReturnType<typeof vi.fn>
  fill: ReturnType<typeof vi.fn>
  stroke: ReturnType<typeof vi.fn>
}

const createMockContext = (): MockedContext => {
  let fillStyle = ''
  let strokeStyle = ''
  let lineWidth = 0

  const context = {
    canvas: { width: 640, height: 480 } as HTMLCanvasElement,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    set fillStyle(value: string | CanvasGradient | CanvasPattern) {
      fillStyle = String(value)
    },
    get fillStyle() {
      return fillStyle
    },
    set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
      strokeStyle = String(value)
    },
    get strokeStyle() {
      return strokeStyle
    },
    set lineWidth(value: number) {
      lineWidth = value
    },
    get lineWidth() {
      return lineWidth
    },
    set font(_: string) {
      /** noop for jsdom canvas mock */
    },
    get font() {
      return ''
    },
  } as unknown as MockedContext

  return context
}

const resetStores = () => {
  usePlayerStore.setState((state) => ({
    ...state,
    players: [],
    activePlayerId: null,
    leaderboardSnapshot: null,
  }))
  useShipStore.setState((state) => ({
    ...state,
    ships: {},
    shipList: [],
  }))
  useTurnTimerStore.setState((state) => ({
    ...state,
    secondsRemaining: 0,
    isPaused: true,
  }))
}

describe('GameBoard', () => {
  let canvasContext: MockedContext

  beforeEach(() => {
    canvasContext = createMockContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext)
    resetStores()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    resetStores()
  })

  it('renders the active commander and timer overlays from state data', () => {
    usePlayerStore.setState((state) => ({
      ...state,
      players: [
        { id: 'player-1', codename: 'Commander Vega' },
        { id: 'player-2', codename: 'Navigator Sol' },
      ],
      activePlayerId: 'player-1',
    }))
    useShipStore.setState((state) => {
      const ships = {
        'ship-1': { id: 'ship-1', ownerId: 'player-1', position: { x: 3, y: 4 } },
      }
      return {
        ...state,
        ships,
        shipList: Object.values(ships),
      }
    })
    useTurnTimerStore.setState((state) => ({
      ...state,
      secondsRemaining: 45,
      isPaused: false,
    }))

    render(<GameBoard />)

    expect(screen.getByTestId('timer-display').textContent).toBe('T-45s')
    expect(screen.getByTestId('commander-display')).toHaveTextContent('Commander Vega')
    expect(screen.getByTestId('fleet-display')).toHaveTextContent('Fleet deployed: 1 ships')
  })

  it('updates the timer overlay when the countdown changes', async () => {
    useTurnTimerStore.setState((state) => ({
      ...state,
      secondsRemaining: 12,
      isPaused: false,
    }))

    render(<GameBoard />)
    expect(screen.getByTestId('timer-display').textContent).toBe('T-12s')

    await act(async () => {
      useTurnTimerStore.setState((state) => ({
        ...state,
        secondsRemaining: 0,
        isPaused: false,
      }))
    })

    await waitFor(() => {
      expect(screen.getByTestId('timer-display')).toHaveTextContent('Turn expired')
    })
  })

  it('draws ship markers at the expected board coordinates', () => {
    usePlayerStore.setState((state) => ({
      ...state,
      players: [{ id: 'pilot', codename: 'Pilot' }],
      activePlayerId: 'pilot',
    }))
    useShipStore.setState((state) => {
      const ships = {
        alpha: { id: 'alpha', ownerId: 'pilot', position: { x: 2, y: 3 } },
      }
      return {
        ...state,
        ships,
        shipList: Object.values(ships),
      }
    })

    render(<GameBoard />)

    const cellWidth = 640 / BOARD_COLUMNS
    const cellHeight = 480 / BOARD_ROWS
    expect(canvasContext.arc).toHaveBeenCalled()
    const [centerX, centerY, radius] = canvasContext.arc.mock.calls[0]

    expect(centerX).toBeCloseTo((2 + 0.5) * cellWidth)
    expect(centerY).toBeCloseTo((3 + 0.5) * cellHeight)
    expect(radius).toBeGreaterThan(0)
  })
})
