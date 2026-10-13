import { useRef, useState, type PointerEvent } from 'react'
import GameBoard, { type BoardPreview } from './components/GameBoard'
import PieceTray from './components/PieceTray'
import { BOARD_SIZE, createEmptyBoard, type Board } from './game/board'
import { clearCompletedLines } from './game/lines'
import { canPlaceShape, placeShape } from './game/placement'
import { generatePieces, type Piece } from './game/shapes'
import './App.css'

type ActiveDrag = {
  piece: Piece
  pointerId: number
}

function App() {
  const [board, setBoard] = useState<Board>(createEmptyBoard)
  const [pieces] = useState<Piece[]>(generatePieces)
  const [preview, setPreview] = useState<BoardPreview | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const previewRef = useRef<BoardPreview | null>(null)

  const updatePreview = (
    piece: Piece,
    clientX: number,
    clientY: number,
  ) => {
    const boardElement = boardRef.current

    if (!boardElement) {
      return
    }

    const bounds = boardElement.getBoundingClientRect()
    const styles = getComputedStyle(boardElement)
    const paddingLeft = Number.parseFloat(styles.paddingLeft)
    const paddingRight = Number.parseFloat(styles.paddingRight)
    const paddingTop = Number.parseFloat(styles.paddingTop)
    const paddingBottom = Number.parseFloat(styles.paddingBottom)
    const gap = Number.parseFloat(styles.columnGap)
    const contentWidth = bounds.width - paddingLeft - paddingRight
    const contentHeight = bounds.height - paddingTop - paddingBottom
    const cellWidth = (contentWidth - gap * (BOARD_SIZE - 1)) / BOARD_SIZE
    const cellHeight = (contentHeight - gap * (BOARD_SIZE - 1)) / BOARD_SIZE
    const x = clientX - bounds.left - paddingLeft
    const y = clientY - bounds.top - paddingTop
    const column = Math.floor(x / (cellWidth + gap))
    const row = Math.floor(y / (cellHeight + gap))
    const insideBoard =
      x >= 0 &&
      y >= 0 &&
      x < contentWidth &&
      y < contentHeight &&
      column >= 0 &&
      column < BOARD_SIZE &&
      row >= 0 &&
      row < BOARD_SIZE

    if (!insideBoard) {
      previewRef.current = null
      setPreview(null)
      return
    }

    const nextPreview: BoardPreview = {
      row,
      col: column,
      shape: piece.shape,
      valid: canPlaceShape(board, piece.shape, row, column),
    }
    previewRef.current = nextPreview
    setPreview(nextPreview)
  }

  const handlePointerDown = (
    piece: Piece,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()
    activeDragRef.current = { piece, pointerId: event.pointerId }
    updatePreview(piece, event.clientX, event.clientY)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = activeDragRef.current

    if (activeDrag?.pointerId === event.pointerId) {
      updatePreview(activeDrag.piece, event.clientX, event.clientY)
    }
  }

  const clearDrag = () => {
    activeDragRef.current = null
    previewRef.current = null
    setPreview(null)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = activeDragRef.current
    const currentPreview = previewRef.current

    if (
      !activeDrag ||
      activeDrag.pointerId !== event.pointerId
    ) {
      return
    }

    if (currentPreview?.valid) {
      setBoard((currentBoard) => {
        const placedBoard = placeShape(
          currentBoard,
          activeDrag.piece.shape,
          currentPreview.row,
          currentPreview.col,
        )

        return clearCompletedLines(placedBoard).board
      })
    }

    clearDrag()
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <p className="eyebrow">PUZZLE ARENA</p>
        <h1>BLOCK BLITZ</h1>
        <p className="subtitle">Build your best board, one block at a time.</p>
      </header>
      <GameBoard board={board} boardRef={boardRef} preview={preview} />
      <PieceTray
        pieces={pieces}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={clearDrag}
      />
    </main>
  )
}

export default App
