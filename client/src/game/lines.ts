import { BOARD_SIZE, type Board } from './board'

export type CompletedLines = {
  rows: number[]
  columns: number[]
}

export type ClearedBoard = {
  board: Board
  clearedRows: number[]
  clearedColumns: number[]
}

export function findCompletedLines(board: Board): CompletedLines {
  const rows = Array.from({ length: BOARD_SIZE }, (_, rowIndex) =>
    board[rowIndex]?.every((occupied) => occupied === true) &&
    board[rowIndex]?.length === BOARD_SIZE
      ? rowIndex
      : -1,
  ).filter((rowIndex) => rowIndex >= 0)

  const columns = Array.from({ length: BOARD_SIZE }, (_, columnIndex) =>
    Array.from({ length: BOARD_SIZE }, (_, rowIndex) =>
      board[rowIndex]?.[columnIndex],
    ).every((occupied) => occupied === true)
      ? columnIndex
      : -1,
  ).filter((columnIndex) => columnIndex >= 0)

  return { rows, columns }
}

export function clearCompletedLines(board: Board): ClearedBoard {
  const { rows, columns } = findCompletedLines(board)
  const completedRows = new Set(rows)
  const completedColumns = new Set(columns)
  const clearedBoard = board.map((boardRow, rowIndex) =>
    boardRow.map((occupied, columnIndex) =>
      completedRows.has(rowIndex) || completedColumns.has(columnIndex)
        ? false
        : occupied,
    ),
  )

  return {
    board: clearedBoard,
    clearedRows: rows,
    clearedColumns: columns,
  }
}
