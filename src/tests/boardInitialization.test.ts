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
    const firstRow = board[0]
    expect(firstRow).toBeDefined()
    if (!firstRow) {
      throw new Error('Expected first row to be defined')
    }

    const secondRow = board[1]
    expect(secondRow).toBeDefined()
    if (!secondRow) {
      throw new Error('Expected second row to be defined')
    }

    const lastRow = board.at(-1)
    expect(lastRow).toBeDefined()
    if (!lastRow) {
      throw new Error('Expected last row to be defined')
    }

    const originCell = firstRow[0]!
    const innerCell = secondRow[1]!
    const finalRowCell = lastRow[0]!

    expect(originCell.id).toBe('r0-c0')
    expect(originCell.isSpawnPoint).toBe(true)
    expect(originCell.occupantId).toBeNull()
    expect(originCell.equationPrompt).toBeTruthy()

    expect(innerCell.isSpawnPoint).toBe(false)
    expect(innerCell.occupantId).toBeNull()
    expect(innerCell.equationSeed).toContain(innerCell.id)
    expect(['easy', 'medium', 'hard']).toContain(innerCell.equationDifficulty)

    expect(finalRowCell.equationDifficulty).toBe('hard')
  })

  it('derives algebra prompts from the equation generator for each territory', async () => {
    const mockGenerator = vi.fn((seed: string) => `Equation for ${seed}`)
    vi.doMock('../math', () => ({
      generateEquationForTerritory: mockGenerator,
    }))

    const { initializeBoard } = await import('../game')

    const board = initializeBoard()
    const thirdRow = board[2]
    expect(thirdRow).toBeDefined()
    if (!thirdRow) {
      throw new Error('Expected third row to be defined')
    }

    const sampleCell = thirdRow[3]!

    expect(mockGenerator).toHaveBeenCalled()
    expect(mockGenerator).toHaveBeenCalledWith(sampleCell.equationSeed)
    expect(sampleCell.equationPrompt).toBe(`Equation for ${sampleCell.equationSeed}`)
  })
})
