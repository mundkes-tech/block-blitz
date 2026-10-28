import { useMemo, type RefObject } from 'react'
import type { Board } from '../game/board'
import type { BlockPattern, BlockShape } from '../game/shapes'
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
  boardColors?: (string | null)[][]
  boardPatterns?: (BlockPattern | null)[][]
  boardRef?: RefObject<HTMLDivElement | null>
  preview?: BoardPreview | null
  effect?: BoardEffect | null
  shake?: boolean
  hammerActive?: boolean
  locked?: boolean
  onCellClick?: (row: number, col: number) => void
}

function GameBoard({
  board,
  boardColors,
  boardPatterns,
  boardRef,
  preview,
  effect,
  shake,
  hammerActive,
  locked,
  onCellClick,
}: GameBoardProps) {
  const previewCells = useMemo(
    () =>
      new Set(
        preview?.shape.cells.map(
          (cell) => `${preview.row + cell.row}:${preview.col + cell.col}`,
        ),
      ),
    [preview],
  )

  const placementCells = useMemo(
    () => new Set(effect?.placedCells.map((cell) => `${cell.row}:${cell.col}`)),
    [effect],
  )

  const clearedCells = useMemo(() => {
    if (!effect) {
      return new Set<string>()
    }

    const cells = new Set<string>()
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row].length; col += 1) {
        if (
          effect.clearedRows.includes(row) ||
          effect.clearedColumns.includes(col)
        ) {
          cells.add(`${row}:${col}`)
        }
      }
    }
    return cells
  }, [board, effect])

  const clearEffect =
    effect && effect.clearedRows.length + effect.clearedColumns.length > 1
      ? 'multi-line'
      : 'line-clear'

  return (
    <div
      ref={boardRef}
      className={`game-board${shake ? ' game-board--shake' : ''}${
        hammerActive ? ' game-board--hammer' : ''
      }${locked ? ' game-board--locked' : ''}`}
      role="grid"
      aria-label="8 by 8 game board"
      aria-disabled={locked}
    >
      {board.map((row, rowIndex) =>
        row.map((occupied, columnIndex) => {
          const cellKey = `${rowIndex}:${columnIndex}`
          const isPreview = previewCells.has(cellKey)
          const isCleared = clearedCells.has(cellKey)
          const isPlaced = placementCells.has(cellKey)

          return (
            <GridCell
              key={`${rowIndex}-${columnIndex}`}
              occupied={occupied}
              color={boardColors?.[rowIndex]?.[columnIndex]}
              pattern={boardPatterns?.[rowIndex]?.[columnIndex]}
              effect={
                isCleared
                  ? clearEffect
                  : isPlaced
                    ? 'placement'
                    : undefined
              }
              preview={
                isPreview
                  ? preview?.valid
                    ? 'valid'
                    : 'invalid'
                  : undefined
              }
              previewColor={preview?.shape.color}
              previewPattern={preview?.shape.pattern}
              isHammerTarget={hammerActive && occupied}
              locked={locked}
              onClick={() => {
                if (hammerActive && occupied && onCellClick && !locked) {
                  onCellClick(rowIndex, columnIndex)
                }
              }}
            />
          )
        }),
      )}
    </div>
  )
}

export default GameBoard
