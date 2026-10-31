import assert from 'node:assert/strict'
import test from 'node:test'
import { BOARD_SIZE, createEmptyBoard, type Board } from './board.js'
import { isGameOver } from './gameOver.js'
import { clearCompletedLines, findCompletedLines } from './lines.js'
import { canPlace, canPlaceShape, placeShape } from './placement.js'
import { mapPointerToAnchor } from './dragGeometry.js'
import {
  calculatePlacementScore,
  updateCombo,
} from './scoring.js'
import { BLOCK_SHAPES, generatePieces } from './shapes.js'

function boardWithRows(rows: number[], columns: number[] = []): Board {
  const board = createEmptyBoard()

  for (const row of rows) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      board[row][column] = true
    }
  }

  for (const column of columns) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      board[row][column] = true
    }
  }

  return board
}

test('creates an empty 8 by 8 board', () => {
  const board = createEmptyBoard()

  assert.equal(board.length, BOARD_SIZE)
  assert.ok(board.every((row) => row.length === BOARD_SIZE))
  assert.ok(board.every((row) => row.every((cell) => cell === false)))
})

test('generates requested pieces from deterministic random values', () => {
  const pieces = generatePieces(3, () => 0)

  assert.equal(pieces.length, 3)
  assert.ok(pieces.every((piece) => piece.shape === BLOCK_SHAPES[0]))
  assert.notEqual(pieces[0].id, pieces[1].id)
})

test('accepts valid placements and rejects occupied or out-of-bounds cells', () => {
  const board = createEmptyBoard()
  const shape = BLOCK_SHAPES.find((candidate) => candidate.id === 'line-2')

  if (!shape) {
    assert.fail('line-2 shape is missing')
  }
  assert.equal(canPlaceShape(board, shape, 0, 0), true)

  const placed = placeShape(board, shape, 0, 0)
  assert.equal(placed[0][0], true)
  assert.equal(placed[0][1], true)
  assert.equal(canPlaceShape(placed, shape, 0, 0), false)
  assert.equal(canPlaceShape(board, shape, 0, BOARD_SIZE - 1), false)
})

test('canPlace validates offset shapes without DOM access', () => {
  const board = createEmptyBoard()
  const shape = [[0, 0], [0, 1], [1, 0]] as const

  assert.equal(canPlace(board, shape, 2, 3), true)
  board[2][4] = true
  assert.equal(canPlace(board, shape, 2, 3), false)
  assert.equal(canPlace(board, shape, 7, 7), false)
})

test('maps the dragged top-left to the nearest grid anchor using grab ratios', () => {
  const anchor = mapPointerToAnchor(
    155,
    133,
    { left: 100, top: 80 },
    {
      paddingLeft: 8,
      paddingTop: 8,
      borderLeft: 1,
      borderTop: 1,
      borderRight: 1,
      borderBottom: 1,
      cellSize: 20,
      gap: 4,
    },
    44,
    20,
    { offsetXRatio: 0.5, offsetYRatio: 0.5 },
  )

  assert.deepEqual(anchor, { row: 1, col: 1 })
})

test('finds and clears simultaneous rows and columns exactly once', () => {
  const board = boardWithRows([0], [0])
  const completed = findCompletedLines(board)

  assert.deepEqual(completed, { rows: [0], columns: [0] })

  const cleared = clearCompletedLines(board)
  assert.deepEqual(cleared.clearedRows, [0])
  assert.deepEqual(cleared.clearedColumns, [0])
  assert.ok(cleared.board.every((row) => row.every((cell) => cell === false)))
})

test('calculates placement scores and combo transitions', () => {
  assert.equal(calculatePlacementScore(4, 2), 240)
  assert.equal(updateCombo(0, 1), 1)
  assert.equal(updateCombo(2, 1), 3)
  assert.equal(updateCombo(3, 0), 0)
})

test('detects game over only when no available piece fits', () => {
  const singlePiece = {
    id: 'test-single',
    shape: BLOCK_SHAPES.find((shape) => shape.id === 'single')!,
  }
  const fullBoard = boardWithRows(Array.from({ length: BOARD_SIZE }, (_, i) => i))

  assert.equal(isGameOver(createEmptyBoard(), [singlePiece]), false)
  assert.equal(isGameOver(fullBoard, [singlePiece]), true)
  assert.equal(isGameOver(createEmptyBoard(), []), true)
})

test('returns game over for no pieces and continues when a piece fits', () => {
  const board = boardWithRows([0])
  const singlePiece = {
    id: 'test-single',
    shape: BLOCK_SHAPES.find((shape) => shape.id === 'single')!,
  }

  assert.equal(isGameOver(board, []), true)
  assert.equal(isGameOver(board, [singlePiece]), false)
})
