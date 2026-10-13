export type BlockCoordinate = {
  row: number
  col: number
}

export type BlockShape = {
  id: string
  name: string
  cells: BlockCoordinate[]
}

export type Piece = {
  id: string
  shape: BlockShape
}

export const BLOCK_SHAPES: BlockShape[] = [
  { id: 'single', name: 'Single', cells: [{ row: 0, col: 0 }] },
  {
    id: 'line-2',
    name: 'Two line',
    cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
  },
  {
    id: 'line-3',
    name: 'Three line',
    cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
  },
  {
    id: 'line-4',
    name: 'Four line',
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
    cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }],
  },
  {
    id: 'square',
    name: 'Square',
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
    cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  },
  {
    id: 'l-4',
    name: 'L',
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
): Piece[] {
  return Array.from({ length: count }, () => {
    const shape = BLOCK_SHAPES[Math.floor(random() * BLOCK_SHAPES.length)]

    return {
      id: `piece-${nextPieceId++}`,
      shape,
    }
  })
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
