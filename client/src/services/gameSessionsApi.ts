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
    status: 'completed'
    score: number
    linesCleared: number
    startedAt: string
    completedAt: string
  }
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
).replace(/\/+$/, '')
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
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
    let body: unknown

    try {
      body = await response.json()
    } catch {
      throw new GameSessionApiError('The session service returned invalid data')
    }

    if (!response.ok) {
      throw new GameSessionApiError('The session service is unavailable')
    }

    return body as T
  } catch (error) {
    if (error instanceof GameSessionApiError) {
      throw error
    }

    throw new GameSessionApiError('The session service is unavailable')
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function createGameSession(): Promise<string> {
  const response = await request<SessionResponse>('/api/game-sessions', {
    method: 'POST',
    body: JSON.stringify({}),
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

  const response = await request<CompletionResponse>(
    `/api/game-sessions/${sessionId}/result`,
    {
      method: 'PATCH',
      body: JSON.stringify({ score, linesCleared }),
    },
  )

  if (
    !response.success ||
    !response.data ||
    response.data.status !== 'completed' ||
    response.data.sessionId !== sessionId ||
    response.data.score !== score ||
    response.data.linesCleared !== linesCleared
  ) {
    throw new GameSessionApiError('The session service returned invalid data')
  }

  return response.data
}
