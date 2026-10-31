import { BOARD_SIZE, type Board } from './board'
import type { BlockShape } from './shapes'

export type ShapeOffsets = readonly (readonly [number, number])[]

export function canPlace(
  board: Board,
  shape: ShapeOffsets,
  startRow: number,
  startCol: number,
): boolean {
  if (
    !Number.isInteger(startRow) ||
    !Number.isInteger(startCol) ||
    startRow < 0 ||
    startCol < 0 ||
    shape.length === 0
  ) {
    return false
  }

  return shape.every(([row, col]) => {
    const boardRow = startRow + row
    const boardCol = startCol + col

    return (
      Number.isInteger(row) &&
      Number.isInteger(col) &&
      row >= 0 &&
      col >= 0 &&
      boardRow < BOARD_SIZE &&
      boardCol < BOARD_SIZE &&
      board[boardRow]?.[boardCol] === false
    )
  })
}

export function canPlaceShape(
  board: Board,
  shape: BlockShape,
  startRow: number,
  startCol: number,
): boolean {
  return canPlace(
    board,
    shape.cells.map(({ row, col }) => [row, col]),
    startRow,
    startCol,
  )
}

export function placeShape(
  board: Board,
  shape: BlockShape,
  startRow: number,
  startCol: number,
): Board {
  return board.map((boardRow, rowIndex) =>
    boardRow.map((occupied, columnIndex) =>
      shape.cells.some(
        ({ row, col }) =>
          startRow + row === rowIndex && startCol + col === columnIndex,
      )
        ? true
        : occupied,
    ),
  )
}
