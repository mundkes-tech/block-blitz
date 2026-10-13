import { BOARD_SIZE, type Board } from './board'
import type { BlockShape } from './shapes'

export function canPlaceShape(
  board: Board,
  shape: BlockShape,
  startRow: number,
  startCol: number,
): boolean {
  if (
    !Number.isInteger(startRow) ||
    !Number.isInteger(startCol) ||
    startRow < 0 ||
    startCol < 0 ||
    shape.cells.length === 0
  ) {
    return false
  }

  return shape.cells.every(({ row, col }) => {
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      col < 0
    ) {
      return false
    }

    const boardRow = startRow + row
    const boardCol = startCol + col

    return (
      boardRow < BOARD_SIZE &&
      boardCol < BOARD_SIZE &&
      board[boardRow]?.[boardCol] === false
    )
  })
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
