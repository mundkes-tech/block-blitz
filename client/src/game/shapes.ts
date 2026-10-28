import type { Board } from './board.js'
import { canPlaceShape } from './placement.js'

export type BlockCoordinate = {
  row: number
  col: number
}

export type BlockPattern =
  | 'dots'
  | 'stripes-diag'
  | 'grid'
  | 'cross'
  | 'rings'
  | 'diamond'
  | 'spark'
  | 'stripes-h'

export type BlockShape = {
  id: string
  name: string
  color: string
  pattern?: BlockPattern
  cells: BlockCoordinate[]
}

export type Piece = {
  id: string
  shape: BlockShape
}

export const BLOCK_SHAPES: BlockShape[] = [
  { id: 'single', name: 'Single', color: '#e69f00', pattern: 'dots', cells: [{ row: 0, col: 0 }] },
  {
    id: 'line-2',
    name: 'Two line',
    color: '#56b4e9',
    pattern: 'stripes-diag',
    cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
  },
  {
    id: 'line-3',
    name: 'Three line',
    color: '#009e73',
    pattern: 'grid',
    cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
  },
  {
    id: 'line-4',
    name: 'Four line',
    color: '#0072b2',
    pattern: 'rings',
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
    color: '#cc79a7',
    pattern: 'spark',
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
    color: '#56b4e9',
    pattern: 'stripes-diag',
    cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }],
  },
  {
    id: 'square',
    name: 'Square',
    color: '#f0e442',
    pattern: 'cross',
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
    color: '#d55e00',
    pattern: 'diamond',
    cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  },
  {
    id: 'l-4',
    name: 'L',
    color: '#d55e00',
    pattern: 'diamond',
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
    color: '#cc79a7',
    pattern: 'spark',
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
    color: '#22d3ee',
    pattern: 'stripes-h',
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
    color: '#009e73',
    pattern: 'grid',
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
