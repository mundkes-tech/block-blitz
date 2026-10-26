import { useState, type FormEvent } from 'react'
import { login, register } from '../services/authApi'
import type { UserProfile } from '../services/gameSessionsApi'

type AuthModalProps = {
  isOpen: boolean
  initialMode?: 'login' | 'register'
  onClose: () => void
  onSuccess: (user: UserProfile) => void
}

export function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'register' && (!name.trim() || name.trim().length < 2)) {
      setError('Player name must be at least 2 characters.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        const result = await register(name.trim(), email.trim(), password)
        onSuccess(result.user)
      } else {
        const result = await login(email.trim(), password)
        onSuccess(result.user)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="modal-card auth-card">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">PLAYER AUTHENTICATION</span>
            <h2 id="auth-modal-title">
              {mode === 'login' ? '🔐 SIGN IN TO PLAY' : '⚡ CREATE PLAYER ACCOUNT'}
            </h2>
          </div>
          <button className="icon-close-btn" type="button" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        {/* Tab switcher: Login / Register */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`tab-btn${mode === 'login' ? ' tab-btn--active' : ''}`}
            onClick={() => {
              setMode('login')
              setError(null)
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`tab-btn${mode === 'register' ? ' tab-btn--active' : ''}`}
            onClick={() => {
              setMode('register')
              setError(null)
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-input-group">
              <label htmlFor="auth-name">Player Name / Handle</label>
              <input
                id="auth-name"
                type="text"
                placeholder="e.g. MasterBlaster"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                required
                autoComplete="nickname"
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={loading}
            />
          </div>

          <p className="auth-disclaimer">
            {mode === 'login'
              ? 'Sign in to access your personal high scores, game history, and rank on the live leaderboard.'
              : 'Creating an account saves all your achievements, high scores, and stats permanently.'}
          </p>

          <footer className="auth-modal-footer">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button auth-submit-btn"
              disabled={loading}
            >
              {loading
                ? 'Processing…'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Register Account'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
