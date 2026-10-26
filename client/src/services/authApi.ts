import type { UserProfile } from './gameSessionsApi'


const AUTH_TOKEN_KEY = 'block-blitz-auth-token'
const AUTH_USER_KEY = 'block-blitz-auth-user'

export type AuthResponseData = {
  token: string
  user: UserProfile
}

export function getStoredAuthToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export function saveAuthSession(token: string, user: UserProfile): void {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  } catch {
    // LocalStorage quota or access error
  }
}

export function clearAuthSession(): void {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    window.localStorage.removeItem(AUTH_USER_KEY)
  } catch {
    // LocalStorage error
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const customBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')

async function apiRequest<T>(
  path: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  // Candidate URLs in priority order:
  // 1. Explicit VITE_API_BASE_URL if configured
  // 2. Direct http://localhost:5000 (bypasses Vite proxy if proxy is not yet running)
  // 3. Relative path (uses Vite dev proxy or same-origin in production)
  const candidateUrls: string[] = []
  if (customBaseUrl) {
    candidateUrls.push(`${customBaseUrl}${path}`)
  }
  candidateUrls.push(`http://localhost:5000${path}`)
  candidateUrls.push(path)

  let lastStatus = 0
  let lastErrorText = ''

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, init)
      lastStatus = response.status

      // If we got a 404 on an endpoint that should exist, try next candidate
      if (response.status === 404 && url !== candidateUrls[candidateUrls.length - 1]) {
        continue
      }

      let payload: { success?: boolean; error?: string; data?: T; message?: string } | null = null
      try {
        payload = await response.json()
      } catch {
        // Not JSON
        lastErrorText = `Server responded with status ${response.status}`
        continue
      }

      if (!response.ok || !payload?.success) {
        return {
          ok: false,
          status: response.status,
          error: payload?.error || payload?.message || `Request failed with status ${response.status}`,
        }
      }

      return {
        ok: true,
        status: response.status,
        data: payload.data,
      }
    } catch (fetchErr) {
      lastErrorText = fetchErr instanceof Error ? fetchErr.message : 'Network error'
    }
  }

  return {
    ok: false,
    status: lastStatus || 0,
    error: lastErrorText || 'Could not connect to the backend server. Please verify it is running on port 5000.',
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponseData> {
  const result = await apiRequest<AuthResponseData>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Registration failed. Please try again.')
  }

  saveAuthSession(result.data.token, result.data.user)
  return result.data
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponseData> {
  const result = await apiRequest<AuthResponseData>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Invalid email or password.')
  }

  saveAuthSession(result.data.token, result.data.user)
  return result.data
}

export async function fetchMe(): Promise<UserProfile | null> {
  const token = getStoredAuthToken()
  if (!token) return null

  const result = await apiRequest<UserProfile>('/api/auth/me', {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!result.ok || !result.data) {
    if (result.status === 401) {
      clearAuthSession()
      return null
    }
    return getStoredUser()
  }

  // Refresh stored user with latest database stats
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.data))
  return result.data
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    })
  } catch {
    // Non-fatal
  } finally {
    clearAuthSession()
  }
}
