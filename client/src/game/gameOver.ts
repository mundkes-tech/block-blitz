import { BOARD_SIZE, type Board } from './board'
import { canPlaceShape } from './placement'
import type { Piece } from './shapes'

export function canAnyPieceFit(board: Board, pieces: Piece[]): boolean {
  return pieces.some((piece) =>
    Array.from({ length: BOARD_SIZE }, (_, row) =>
      Array.from({ length: BOARD_SIZE }, (_, col) =>
        canPlaceShape(board, piece.shape, row, col),
      ).some(Boolean),
    ).some(Boolean),
  )
}

export function isGameOver(board: Board, pieces: Piece[]): boolean {
  return pieces.length === 0 || !canAnyPieceFit(board, pieces)
}
