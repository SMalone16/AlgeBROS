import { useEffect, useRef } from 'react'

const BOARD_WIDTH = 640
const BOARD_HEIGHT = 480

export const GameBoard = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#10131a'
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.strokeStyle = '#2f3b52'
    context.lineWidth = 1

    const cellSize = 40
    for (let x = 0; x <= canvas.width; x += cellSize) {
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, canvas.height)
      context.stroke()
    }

    for (let y = 0; y <= canvas.height; y += cellSize) {
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(canvas.width, y)
      context.stroke()
    }

    context.fillStyle = '#4ade80'
    context.font = '16px "Fira Code", monospace'
    context.fillText('AlgeBROS battle grid placeholder', 16, 32)
    context.fillStyle = '#60a5fa'
    context.fillText('TODO: Render ships and algebraic objectives', 16, 56)

    /**
     * TODO: Subscribe to Zustand selectors for board state, ship positions, and
     * timer updates. The canvas should react to store changes once the MVP
     * state architecture is finalized.
     */
  }, [])

  return (
    <section className="game-board" aria-label="AlgeBROS tactical display">
      <canvas
        ref={canvasRef}
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        role="img"
      />
      <p className="game-board__caption">
        Tactical simulation placeholder — hook up live data via the state
        stores to animate fleet movement and territory control.
      </p>
    </section>
  )
}
