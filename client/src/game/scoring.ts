export const SCORE_PER_BLOCK = 10
export const SCORE_PER_CLEARED_LINE = 100

export function calculatePlacementScore(
  blockCount: number,
  clearedLineCount: number,
): number {
  return (
    blockCount * SCORE_PER_BLOCK +
    clearedLineCount * SCORE_PER_CLEARED_LINE
  )
}

export function updateCombo(combo: number, clearedLineCount: number): number {
  return clearedLineCount > 0 ? combo + 1 : 0
}
