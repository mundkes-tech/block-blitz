import type { MoveLogEntry } from './gameSessionsApi'

export const SCORE_RETRY_QUEUE_KEY = 'block-blitz-score-retry-v1'

export type ScoreRetryEntry = {
  requestId: string
  sessionId: string | null
  userId: string
  score: number
  linesCleared: number
  blocksPlaced: number
  highestCombo: number
  duration: number
  moveLog: MoveLogEntry[]
  timestamp: number
  attempts: number
  nextAttemptAt: number
}

function readQueue(): ScoreRetryEntry[] {
  try {
    const raw = window.localStorage.getItem(SCORE_RETRY_QUEUE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as ScoreRetryEntry[] : []
  } catch {
    return []
  }
}

function writeQueue(entries: ScoreRetryEntry[]): void {
  try {
    window.localStorage.setItem(SCORE_RETRY_QUEUE_KEY, JSON.stringify(entries))
  } catch {
    console.warn('Unable to persist score retry queue')
  }
}

export function enqueueScoreRetry(entry: Omit<ScoreRetryEntry, 'attempts' | 'nextAttemptAt'>): void {
  const queue = readQueue().filter((item) => item.requestId !== entry.requestId)
  queue.push({ ...entry, attempts: 0, nextAttemptAt: Date.now() })
  writeQueue(queue)
}

export function getDueScoreRetries(now = Date.now()): ScoreRetryEntry[] {
  return readQueue().filter((entry) => entry.nextAttemptAt <= now)
}

export function updateScoreRetry(entry: ScoreRetryEntry): void {
  const queue = readQueue().map((item) => item.requestId === entry.requestId ? entry : item)
  writeQueue(queue)
}

export function removeScoreRetry(requestId: string): void {
  writeQueue(readQueue().filter((entry) => entry.requestId !== requestId))
}

export function getScoreRetryCount(): number {
  return readQueue().length
}

export function scheduleScoreRetry(entry: ScoreRetryEntry): ScoreRetryEntry {
  const attempts = entry.attempts + 1
  return {
    ...entry,
    attempts,
    nextAttemptAt: Date.now() + Math.min(30 * 60_000, 1000 * 2 ** Math.min(attempts, 10)),
  }
}
