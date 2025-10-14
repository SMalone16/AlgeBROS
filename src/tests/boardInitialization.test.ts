import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('initializeBoard', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doUnmock('../math')
  })

  it('builds a board that matches the configured grid dimensions', async () => {
    const { initializeBoard, BOARD_ROWS, BOARD_COLUMNS } = await import('../game')

    const board = initializeBoard()

    expect(board).toHaveLength(BOARD_ROWS)
    board.forEach((row) => {
      expect(row).toHaveLength(BOARD_COLUMNS)
    })
  })

  it('assigns default metadata and algebra fields to each cell', async () => {
    const { initializeBoard } = await import('../game')

    const board = initializeBoard()
    const originCell = board[0][0]
    const innerCell = board[1][1]
    const finalRowCell = board.at(-1)?.[0]

    expect(originCell.id).toBe('r0-c0')
    expect(originCell.isSpawnPoint).toBe(true)
    expect(originCell.occupantId).toBeNull()
    expect(originCell.equationPrompt).toBeTruthy()

    expect(innerCell.isSpawnPoint).toBe(false)
    expect(innerCell.occupantId).toBeNull()
    expect(innerCell.equationSeed).toContain(innerCell.id)
    expect(['easy', 'medium', 'hard']).toContain(innerCell.equationDifficulty)

    expect(finalRowCell?.equationDifficulty).toBe('hard')
  })

  it('derives algebra prompts from the equation generator for each territory', async () => {
    const mockGenerator = vi.fn((seed: string) => `Equation for ${seed}`)
    vi.doMock('../math', () => ({
      generateEquationForTerritory: mockGenerator,
    }))

    const { initializeBoard } = await import('../game')

    const board = initializeBoard()
    const sampleCell = board[2][3]

    expect(mockGenerator).toHaveBeenCalled()
    expect(mockGenerator).toHaveBeenCalledWith(sampleCell.equationSeed)
    expect(sampleCell.equationPrompt).toBe(`Equation for ${sampleCell.equationSeed}`)
  })
})
