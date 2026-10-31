import { BOARD_SIZE, type Board } from './board'
import { canPlaceShape } from './placement'
import type { BlockShape } from './shapes'

export type GridGeometry = {
  paddingLeft: number
  paddingTop: number
  borderLeft: number
  borderTop: number
  borderRight: number
  borderBottom: number
  cellSize: number
  gap: number
}

export type DragOffset = {
  offsetXRatio: number
  offsetYRatio: number
}

export type GridAnchor = {
  row: number
  col: number
}

export function mapPointerToAnchor(
  pointerX: number,
  pointerY: number,
  rect: Pick<DOMRect, 'left' | 'top'>,
  geometry: GridGeometry,
  pieceWidth: number,
  pieceHeight: number,
  offset: DragOffset,
): GridAnchor {
  const pieceLeft = pointerX - offset.offsetXRatio * pieceWidth
  const pieceTop = pointerY - offset.offsetYRatio * pieceHeight
  const step = geometry.cellSize + geometry.gap

  return {
    col: Math.round(
      (pieceLeft - rect.left - geometry.paddingLeft - geometry.borderLeft) / step,
    ),
    row: Math.round(
      (pieceTop - rect.top - geometry.paddingTop - geometry.borderTop) / step,
    ),
  }
}

export function findForgivingAnchor(
  board: Board,
  shape: BlockShape,
  anchor: GridAnchor,
  pointerX: number,
  pointerY: number,
  rect: Pick<DOMRect, 'left' | 'top'>,
  geometry: GridGeometry,
  pieceWidth: number,
  pieceHeight: number,
  offset: DragOffset,
): GridAnchor | null {
  if (canPlaceShape(board, shape, anchor.row, anchor.col)) {
    return anchor
  }

  const step = geometry.cellSize + geometry.gap
  const pieceLeft = pointerX - offset.offsetXRatio * pieceWidth
  const pieceTop = pointerY - offset.offsetYRatio * pieceHeight
  const targetCenterX = pieceLeft + pieceWidth / 2
  const targetCenterY = pieceTop + pieceHeight / 2
  const candidates: GridAnchor[] = []

  for (let row = anchor.row - 1; row <= anchor.row + 1; row += 1) {
    for (let col = anchor.col - 1; col <= anchor.col + 1; col += 1) {
      if (row === anchor.row && col === anchor.col) continue
      if (canPlaceShape(board, shape, row, col)) {
        candidates.push({ row, col })
      }
    }
  }

  const validCandidates = candidates
    .map((candidate) => {
      const candidateLeft =
        rect.left +
        geometry.borderLeft +
        geometry.paddingLeft +
        candidate.col * step
      const candidateTop =
        rect.top +
        geometry.borderTop +
        geometry.paddingTop +
        candidate.row * step
      const centerX = candidateLeft + pieceWidth / 2
      const centerY = candidateTop + pieceHeight / 2
      const distance = Math.hypot(centerX - targetCenterX, centerY - targetCenterY)

      return { candidate, distance }
    })
    .filter(({ distance }) => distance <= geometry.cellSize / 2)
    .sort((left, right) => left.distance - right.distance)

  return validCandidates[0]?.candidate ?? null
}

export function getPieceSize(
  shape: BlockShape,
  geometry: GridGeometry,
): { width: number; height: number } {
  const rows = Math.max(...shape.cells.map(({ row }) => row)) + 1
  const cols = Math.max(...shape.cells.map(({ col }) => col)) + 1
  return {
    width: cols * geometry.cellSize + (cols - 1) * geometry.gap,
    height: rows * geometry.cellSize + (rows - 1) * geometry.gap,
  }
}

export function isAnchorInBoard(anchor: GridAnchor): boolean {
  return (
    anchor.row >= 0 &&
    anchor.row < BOARD_SIZE &&
    anchor.col >= 0 &&
    anchor.col < BOARD_SIZE
  )
}
