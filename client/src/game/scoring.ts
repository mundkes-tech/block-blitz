export const SCORE_PER_BLOCK = 10
export const SCORE_PER_CLEARED_LINE = 100
export const COMBO_BONUS_PER_LEVEL = 50

export function calculatePlacementScore(
  blockCount: number,
  clearedLineCount: number,
  combo = 0,
): number {
  const baseBlockScore = blockCount * SCORE_PER_BLOCK
  const baseLineScore = clearedLineCount * SCORE_PER_CLEARED_LINE
  const comboBonus = combo > 0 && clearedLineCount > 0 ? combo * COMBO_BONUS_PER_LEVEL : 0

  return baseBlockScore + baseLineScore + comboBonus
}

export function updateCombo(combo: number, clearedLineCount: number): number {
  return clearedLineCount > 0 ? combo + 1 : 0
}
