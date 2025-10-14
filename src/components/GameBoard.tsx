import { useEffect, useMemo, useRef } from 'react'
import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  initializeBoard,
  type BoardState,
  type BoardStateCell,
} from '../game'
import {
  selectActivePlayer,
  selectPlayers,
  selectSecondsRemaining,
  selectIsTimerPaused,
  usePlayerStore,
  useShipStore,
  useTurnTimerStore,
  selectAllShips,
} from '../state'
import { shallow } from 'zustand/shallow'

const BOARD_WIDTH = 640
const BOARD_HEIGHT = 480

const TERRAIN_COLORS: Record<BoardStateCell['terrainType'], string> = {
  open: '#111827',
  nebula: '#1f2937',
  asteroid: '#0f172a',
  warpGate: '#1d4ed8',
  relic: '#f59e0b',
}

const PLAYER_COLORS = ['#38bdf8', '#f97316', '#a855f7', '#22c55e', '#facc15', '#fb7185']

const formatTimerLabel = (secondsRemaining: number, isPaused: boolean): string => {
  if (isPaused && secondsRemaining === 0) {
    return 'Timer paused'
  }

  if (!isPaused && secondsRemaining === 0) {
    return 'Turn expired'
  }

  if (isPaused) {
    return `Paused at T-${secondsRemaining}s`
  }

  return `T-${secondsRemaining}s`
}

const drawBoard = (
  context: CanvasRenderingContext2D,
  board: BoardState,
  shipPositions: ReturnType<typeof selectAllShips>,
  ownerColors: Map<string, string>,
) => {
  const { width, height } = context.canvas
  if (board.length === 0 || board[0].length === 0) {
    context.clearRect(0, 0, width, height)
    return
  }

  const cellWidth = width / BOARD_COLUMNS
  const cellHeight = height / BOARD_ROWS

  context.clearRect(0, 0, width, height)

  board.forEach((row) => {
    row.forEach((cell) => {
      const x = cell.column * cellWidth
      const y = cell.row * cellHeight

      context.fillStyle = TERRAIN_COLORS[cell.terrainType]
      context.fillRect(x, y, cellWidth, cellHeight)

      if (cell.isObjective) {
        context.fillStyle = 'rgba(255, 255, 255, 0.2)'
        context.fillRect(x, y, cellWidth, cellHeight)
      } else if (cell.isSpawnPoint) {
        context.fillStyle = 'rgba(59, 130, 246, 0.15)'
        context.fillRect(x, y, cellWidth, cellHeight)
      }

      context.strokeStyle = 'rgba(148, 163, 184, 0.25)'
      context.lineWidth = 1
      context.strokeRect(x, y, cellWidth, cellHeight)
    })
  })

  shipPositions.forEach((ship) => {
    const centerX = (ship.position.x + 0.5) * cellWidth
    const centerY = (ship.position.y + 0.5) * cellHeight
    const radius = Math.min(cellWidth, cellHeight) * 0.3

    context.beginPath()
    context.fillStyle = ownerColors.get(ship.ownerId) ?? '#f97316'
    context.strokeStyle = 'rgba(15, 23, 42, 0.65)'
    context.lineWidth = 2
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  })
}

export const GameBoard = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const board = useMemo<BoardState>(() => initializeBoard(), [])
  const players = usePlayerStore(selectPlayers, shallow)
  const activePlayer = usePlayerStore(selectActivePlayer)
  const ships = useShipStore(selectAllShips, shallow)
  const secondsRemaining = useTurnTimerStore(selectSecondsRemaining)
  const isPaused = useTurnTimerStore(selectIsTimerPaused)

  const ownerColors = useMemo(() => {
    const mapping = new Map<string, string>()
    players.forEach((player, index) => {
      mapping.set(player.id, PLAYER_COLORS[index % PLAYER_COLORS.length])
    })
    return mapping
  }, [players])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }

    drawBoard(context, board, ships, ownerColors)
  }, [board, ships, ownerColors])

  const timerLabel = formatTimerLabel(secondsRemaining, isPaused)
  const activeCommander = activePlayer?.codename ?? 'Awaiting commander'

  return (
    <section className="game-board" aria-label="AlgeBROS tactical display">
      <div className="game-board__canvas" style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          role="img"
          aria-label="Strategic battle grid"
        />
        <div
          className="game-board__overlay"
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(15,23,42,0.45))',
            color: '#f8fafc',
            borderRadius: '0.75rem',
            pointerEvents: 'none',
            maxWidth: 'min(320px, 100%)',
          }}
        >
          <p data-testid="timer-display">{timerLabel}</p>
          <p data-testid="commander-display">Active Commander: {activeCommander}</p>
          <p data-testid="fleet-display">Fleet deployed: {ships.length} ships</p>
        </div>
      </div>
    </section>
  )
}
