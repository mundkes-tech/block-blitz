export const BOARD_SIZE = 8

export type Board = boolean[][]

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false),
  )
}
