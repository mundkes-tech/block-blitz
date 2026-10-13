import type { Board } from '../game/board'
import GridCell from './GridCell'

type GameBoardProps = {
  board: Board
}

function GameBoard({ board }: GameBoardProps) {
  return (
    <div className="game-board" role="grid" aria-label="8 by 8 game board">
      {board.map((row, rowIndex) =>
        row.map((occupied, columnIndex) => (
          <GridCell
            key={`${rowIndex}-${columnIndex}`}
            occupied={occupied}
          />
        )),
      )}
    </div>
  )
}

export default GameBoard
