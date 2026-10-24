import type { Board } from './board.js'
import { canPlaceShape } from './placement.js'

export type BlockCoordinate = {
  row: number
  col: number
}

export type BlockShape = {
  id: string
  name: string
  color: string
  cells: BlockCoordinate[]
}

export type Piece = {
  id: string
  shape: BlockShape
}

export const BLOCK_SHAPES: BlockShape[] = [
  { id: 'single', name: 'Single', color: '#f59e0b', cells: [{ row: 0, col: 0 }] },
  {
    id: 'line-2',
    name: 'Two line',
    color: '#06b6d4',
    cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
  },
  {
    id: 'line-3',
    name: 'Three line',
    color: '#0ea5e9',
    cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
  },
  {
    id: 'line-4',
    name: 'Four line',
    color: '#3b82f6',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ],
  },
  {
    id: 'line-5',
    name: 'Five line',
    color: '#6366f1',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ],
  },
  {
    id: 'vertical-3',
    name: 'Vertical three',
    color: '#8b5cf6',
    cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }],
  },
  {
    id: 'square',
    name: 'Square',
    color: '#eab308',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ],
  },
  {
    id: 'l-3',
    name: 'Small L',
    color: '#ec4899',
    cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  },
  {
    id: 'l-4',
    name: 'L',
    color: '#f97316',
    cells: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
    ],
  },
  {
    id: 't-4',
    name: 'T',
    color: '#a855f7',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 1 },
    ],
  },
  {
    id: 'z-4',
    name: 'Z',
    color: '#10b981',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ],
  },
  {
    id: 'plus-5',
    name: 'Plus',
    color: '#14b8a6',
    cells: [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
    ],
  },
]

let nextPieceId = 1

export function generatePieces(
  count = 3,
  random = Math.random,
  board?: Board,
): Piece[] {
  const pieces = Array.from({ length: count }, () => {
    const shape = BLOCK_SHAPES[Math.floor(random() * BLOCK_SHAPES.length)]

    return {
      id: `piece-${nextPieceId++}`,
      shape,
    }
  })

  // Fair generation algorithm: avoid impossible game-over deals if valid moves exist
  if (board) {
    const hasAnyValidMove = pieces.some((p) => {
      for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
          if (canPlaceShape(board, p.shape, r, c)) return true
        }
      }
      return false
    })

    if (!hasAnyValidMove) {
      // Find a shape from catalog that fits on the board
      const viableShape = BLOCK_SHAPES.find((candidate) => {
        for (let r = 0; r < board.length; r++) {
          for (let c = 0; c < board[r].length; c++) {
            if (canPlaceShape(board, candidate, r, c)) return true
          }
        }
        return false
      })

      if (viableShape && pieces.length > 0) {
        pieces[pieces.length - 1] = {
          id: `piece-${nextPieceId++}`,
          shape: viableShape,
        }
      }
    }
  }

  return pieces
}

export function getShapeDimensions(shape: BlockShape): {
  rows: number
  cols: number
} {
  return {
    rows: Math.max(...shape.cells.map(({ row }) => row)) + 1,
    cols: Math.max(...shape.cells.map(({ col }) => col)) + 1,
  }
}
