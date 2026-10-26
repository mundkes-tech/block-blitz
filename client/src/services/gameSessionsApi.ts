type SessionResponse = {
  success: boolean
  data?: {
    sessionId: string
    status: 'in_progress'
    startedAt: string
  }
}

type CompletionResponse = {
  success: boolean
  data?: {
    sessionId: string
    userId?: string | null
    status: 'completed'
    score: number
    linesCleared: number
    blocksPlaced?: number
    highestCombo?: number
    duration?: number
    startedAt: string
    completedAt: string
  }
}

export type GameSessionHistoryItem = {
  sessionId: string
  userId?: string | null
  score: number
  linesCleared: number
  blocksPlaced?: number
  highestCombo?: number
  duration?: number
  startedAt: string
  completedAt: string
}

export type GameSessionHistory = {
  items: GameSessionHistoryItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type GameSessionStats = {
  totalCompletedGames: number
  highestScore: number
  averageScore: number
  totalLinesCleared: number
  mostRecentCompletedAt: string | null
}

export type LeaderboardEntry = {
  rank: number
  playerName: string
  userId?: string | null
  score: number
  linesCleared: number
  highestCombo?: number
  completedAt: string
}

export type LeaderboardResponse = {
  items: LeaderboardEntry[]
  pagination: GameSessionHistory['pagination']
}

export type UserProfile = {
  id: string
  name: string
  email: string
  highestScore: number
  totalGames: number
  totalLinesCleared: number
  highestCombo: number
  createdAt: string
}

const REQUEST_TIMEOUT_MS = 5000
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class GameSessionApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GameSessionApiError'
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const candidateUrls: string[] = []
  const customBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')
  if (customBase) {
    candidateUrls.push(`${customBase}${path}`)
  }
  candidateUrls.push(`http://localhost:5000${path}`)
  candidateUrls.push(path)

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let lastResponse: Response | null = null

  try {
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...init.headers,
          },
        })
        if (res.status === 404 && url !== candidateUrls[candidateUrls.length - 1]) {
          continue
        }
        lastResponse = res
        break
      } catch {
        // Try next candidate
      }
    }

    if (!lastResponse) {
      throw new GameSessionApiError('The session service is unavailable')
    }

    let body: unknown
    try {
      body = await lastResponse.json()
    } catch {
      throw new GameSessionApiError('The session service returned invalid data')
    }

    if (!lastResponse.ok) {
      throw new GameSessionApiError('The session service is unavailable')
    }

    return body as T
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function createGameSession(userId?: string): Promise<string> {
  const response = await request<SessionResponse>('/api/games/start', {
    method: 'POST',
    body: JSON.stringify(userId ? { userId } : {}),
  }).catch(() => {
    // Fallback to legacy endpoint if /api/games/start is not ready
    return request<SessionResponse>('/api/game-sessions', {
      method: 'POST',
      body: JSON.stringify(userId ? { userId } : {}),
    })
  })

  if (
    !response.success ||
    !response.data ||
    response.data.status !== 'in_progress' ||
    !SESSION_ID_PATTERN.test(response.data.sessionId)
  ) {
    throw new GameSessionApiError('The session service returned invalid data')
  }

  return response.data.sessionId
}

export async function completeGameSession(
  sessionId: string,
  score: number,
  linesCleared: number,
  blocksPlaced = 0,
  highestCombo = 0,
  duration = 0,
): Promise<CompletionResponse['data']> {
  if (
    !SESSION_ID_PATTERN.test(sessionId) ||
    !Number.isSafeInteger(score) ||
    score < 0 ||
    !Number.isSafeInteger(linesCleared) ||
    linesCleared < 0
  ) {
    throw new GameSessionApiError('Invalid game result')
  }

  const payload = {
    score,
    linesCleared,
    blocksPlaced,
    highestCombo,
    duration,
  }

  const response = await request<CompletionResponse>(
    `/api/games/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ sessionId, ...payload }),
    },
  ).catch(() => {
    // Fallback to legacy endpoint
    return request<CompletionResponse>(
      `/api/game-sessions/${sessionId}/result`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    )
  })

  if (
    !response.success ||
    !response.data ||
    response.data.status !== 'completed' ||
    response.data.sessionId !== sessionId
  ) {
    throw new GameSessionApiError('The session service returned invalid data')
  }

  return response.data
}

export async function fetchGameSessionHistory(
  page = 1,
  pageSize = 20,
  userId?: string,
): Promise<GameSessionHistory> {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new GameSessionApiError('Invalid history pagination')
  }

  const userQuery = userId ? `&userId=${encodeURIComponent(userId)}` : ''
  const response = await request<{
    success: boolean
    data?: GameSessionHistory
  }>(`/api/games/history?page=${page}&pageSize=${pageSize}${userQuery}`, {
    method: 'GET',
  }).catch(() => {
    return request<{
      success: boolean
      data?: GameSessionHistory
    }>(`/api/game-sessions?page=${page}&pageSize=${pageSize}`, {
      method: 'GET',
    })
  })
  const data = response.data

  if (
    !response.success ||
    !data ||
    !Array.isArray(data.items) ||
    !data.pagination
  ) {
    throw new GameSessionApiError('The session service returned invalid data')
  }

  return data
}

export async function fetchGameSessionStats(userId?: string): Promise<GameSessionStats> {
  const userQuery = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const response = await request<{
    success: boolean
    data?: GameSessionStats
  }>(`/api/games/stats${userQuery}`, { method: 'GET' }).catch(() => {
    return request<{
      success: boolean
      data?: GameSessionStats
    }>('/api/game-sessions/stats', { method: 'GET' })
  })
  const data = response.data

  if (!response.success || !data) {
    throw new GameSessionApiError('The session service returned invalid data')
  }

  return data
}

export async function fetchLeaderboard(
  page = 1,
  pageSize = 20,
  timeframe = 'all',
): Promise<LeaderboardResponse> {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new GameSessionApiError('Invalid leaderboard pagination')
  }

  const response = await request<{
    success: boolean
    data?: LeaderboardResponse
  }>(`/api/leaderboard?page=${page}&pageSize=${pageSize}&timeframe=${timeframe}`, {
    method: 'GET',
  })
  const data = response.data

  if (
    !response.success ||
    !data ||
    !Array.isArray(data.items) ||
    !data.pagination
  ) {
    throw new GameSessionApiError('The session service returned invalid data')
  }

  return data
}

export async function fetchMyRank(
  userId: string,
): Promise<{ rank: number; highestScore: number } | null> {
  const response = await request<{
    success: boolean
    data?: { rank: number; highestScore: number } | null
  }>(`/api/leaderboard/me?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
  })
  return response.data ?? null
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const response = await request<{
    success: boolean
    data?: UserProfile[]
  }>('/api/auth/users', { method: 'GET' })
  return response.data ?? []
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const response = await request<{
      success: boolean
      data?: UserProfile | null
    }>(`/api/auth/profile/${encodeURIComponent(userId)}`, { method: 'GET' })
    return response.data ?? null
  } catch {
    return null
  }
}
