export type Achievement = {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_clear',
    title: 'First Blast',
    description: 'Clear your first complete row or column.',
    icon: '⚡',
    xpReward: 100,
  },
  {
    id: 'double_clear',
    title: 'Double Trouble',
    description: 'Clear 2 lines simultaneously in a single placement.',
    icon: '✨',
    xpReward: 200,
  },
  {
    id: 'triple_clear',
    title: 'Triple Threat',
    description: 'Clear 3 or more lines in one explosive blast.',
    icon: '💥',
    xpReward: 400,
  },
  {
    id: 'combo_master',
    title: 'Combo Master',
    description: 'Achieve a 4x or higher consecutive combo streak.',
    icon: '🔥',
    xpReward: 300,
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Place 50 or more blocks in your puzzle matches.',
    icon: '🧱',
    xpReward: 250,
  },
  {
    id: 'score_5k',
    title: 'High Roller',
    description: 'Score over 5,000 points in a single match.',
    icon: '🏆',
    xpReward: 500,
  },
  {
    id: 'score_10k',
    title: 'Grandmaster',
    description: 'Score over 10,000 points in a single match.',
    icon: '👑',
    xpReward: 1000,
  },
  {
    id: 'hammer_used',
    title: 'Demolitionist',
    description: 'Smash a stubborn obstacle using the Hammer booster.',
    icon: '🔨',
    xpReward: 150,
  },
  {
    id: 'reroll_used',
    title: 'Tactician',
    description: 'Redraw a fresh hand using the Reroll booster.',
    icon: '🔄',
    xpReward: 150,
  },
]

export const ACHIEVEMENTS_STORAGE_KEY = 'block-blitz-unlocked-achievements'

export function readUnlockedAchievements(): string[] {
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveUnlockedAchievements(ids: string[]): void {
  try {
    window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // LocalStorage fallback
  }
}

export type PlayerLevelInfo = {
  level: number
  title: string
  currentXP: number
  nextLevelXP: number
  progressPercent: number
}

export function calculatePlayerLevel(totalXP: number): PlayerLevelInfo {
  const tiers = [
    { level: 1, title: 'Novice', maxXP: 300 },
    { level: 2, title: 'Apprentice', maxXP: 800 },
    { level: 3, title: 'Tactician', maxXP: 1800 },
    { level: 4, title: 'Master', maxXP: 3500 },
    { level: 5, title: 'Grandmaster', maxXP: 6000 },
    { level: 6, title: 'Legendary', maxXP: 10000 },
  ]

  let currentTier = tiers[0]
  let prevMax = 0

  for (const tier of tiers) {
    if (totalXP < tier.maxXP) {
      currentTier = tier
      break
    }
    prevMax = tier.maxXP
    currentTier = tier
  }

  const span = currentTier.maxXP - prevMax
  const inTier = Math.max(0, totalXP - prevMax)
  const progressPercent = Math.min(100, Math.round((inTier / span) * 100))

  return {
    level: currentTier.level,
    title: currentTier.title,
    currentXP: totalXP,
    nextLevelXP: currentTier.maxXP,
    progressPercent,
  }
}
