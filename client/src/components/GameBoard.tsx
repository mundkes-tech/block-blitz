import type { RefObject } from 'react'
import type { Board } from '../game/board'
import type { BlockShape } from '../game/shapes'
import GridCell from './GridCell'

export type BoardPreview = {
  row: number
  col: number
  shape: BlockShape
  valid: boolean
}

export type BoardEffect = {
  id: number
  placedCells: { row: number; col: number }[]
  clearedRows: number[]
  clearedColumns: number[]
}

type GameBoardProps = {
  board: Board
  boardRef?: RefObject<HTMLDivElement | null>
  preview?: BoardPreview | null
  effect?: BoardEffect | null
}

function GameBoard({ board, boardRef, preview, effect }: GameBoardProps) {
  return (
    <div
      ref={boardRef}
      className="game-board"
      role="grid"
      aria-label="8 by 8 game board"
    >
      {board.map((row, rowIndex) =>
        row.map((occupied, columnIndex) => (
          <GridCell
            key={`${rowIndex}-${columnIndex}`}
            occupied={occupied}
            effect={
              effect?.clearedRows.includes(rowIndex) ||
              effect?.clearedColumns.includes(columnIndex)
                ? effect.clearedRows.length + effect.clearedColumns.length > 1
                  ? 'multi-line'
                  : 'line-clear'
                : effect?.placedCells.some(
                      (cell) => cell.row === rowIndex && cell.col === columnIndex,
                    )
                  ? 'placement'
                  : undefined
            }
            preview={
              preview &&
              preview.shape.cells.some(
                (cell) =>
                  preview.row + cell.row === rowIndex &&
                  preview.col + cell.col === columnIndex,
              )
                ? preview.valid
                  ? 'valid'
                  : 'invalid'
                : undefined
            }
          />
        )),
      )}
    </div>
  )
}

export default GameBoard
