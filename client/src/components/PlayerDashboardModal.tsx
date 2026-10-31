import { useEffect, useRef, useState } from 'react'
import {
  fetchGameSessionHistory,
  fetchGameSessionStats,
  type GameSessionHistoryItem,
  type GameSessionStats,
  type UserProfile,
} from '../services/gameSessionsApi'

type PlayerDashboardModalProps = {
  isOpen: boolean
  onClose: () => void
  currentUser: UserProfile | null
  onOpenAuth: () => void
  onLogout: () => void
}

export function PlayerDashboardModal({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onLogout,
}: PlayerDashboardModalProps) {
  const [stats, setStats] = useState<GameSessionStats | null>(null)
  const [history, setHistory] = useState<GameSessionHistoryItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalGames, setTotalGames] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeRequestRef = useRef(0)

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Data fetching
  useEffect(() => {
    if (!isOpen) return

    if (!currentUser?.id) {
      return
    }

    const requestId = ++activeRequestRef.current

    const timer = setTimeout(() => {
      if (activeRequestRef.current === requestId) {
        setLoading(true)
      }
    }, 0)

    Promise.all([
      fetchGameSessionStats(currentUser.id),
      fetchGameSessionHistory(page, 10, currentUser.id),
    ])
      .then(([statsData, historyData]) => {
        if (activeRequestRef.current === requestId) {
          setStats(statsData)
          setHistory(historyData.items)
          setTotalPages(historyData.pagination.totalPages || 1)
          setTotalGames(historyData.pagination.total || 0)
          setError(null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (activeRequestRef.current === requestId) {
          setError('Could not retrieve player statistics.')
          setLoading(false)
        }
      })

    return () => {
      clearTimeout(timer)
    }
  }, [isOpen, currentUser?.id, page])

  if (!isOpen) return null

  const formatDuration = (secs?: number) => {
    if (!secs) return '0:00'
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card dashboard-card animate-scale-up">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">CAREER PROFILE & TELEMETRY</span>
            <h2 id="dashboard-title">📊 PLAYER DASHBOARD</h2>
          </div>
          <button
            className="icon-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close dashboard modal"
          >
            ✕
          </button>
        </header>

        {currentUser ? (
          <div className="dashboard-body">
            {/* Player Banner */}
            <div className="profile-info-banner">
              <div className="profile-avatar" aria-hidden="true">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="profile-meta">
                <h3>{currentUser.name}</h3>
                <p className="profile-email">{currentUser.email}</p>
                <span className="profile-registered">Member since {formatDate(currentUser.createdAt)}</span>
              </div>
              <button
                type="button"
                className="dashboard-signout-btn"
                onClick={() => {
                  onLogout()
                  onClose()
                }}
              >
                Sign Out
              </button>
            </div>

            {/* Career Metrics Grid */}
            <div className="dashboard-metrics-grid">
              <div className="metric-box">
                <span className="metric-label">CAREER BEST</span>
                <strong className="metric-number text-accent tabular-nums font-mono">
                  {(currentUser.highestScore ?? stats?.highestScore ?? 0).toLocaleString()}
                </strong>
              </div>
              <div className="metric-box">
                <span className="metric-label">TOTAL MATCHES</span>
                <strong className="metric-number tabular-nums font-mono">
                  {totalGames || stats?.totalCompletedGames || currentUser.totalGames || 0}
                </strong>
              </div>
              <div className="metric-box">
                <span className="metric-label">TOTAL LINES</span>
                <strong className="metric-number tabular-nums font-mono">
                  {(stats?.totalLinesCleared ?? currentUser.totalLinesCleared ?? 0).toLocaleString()}
                </strong>
              </div>
              <div className="metric-box">
                <span className="metric-label">AVERAGE SCORE</span>
                <strong className="metric-number tabular-nums font-mono">
                  {Math.round(stats?.averageScore ?? 0).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Match History Table */}
            <section className="dashboard-history-section" aria-label="Recent match history">
              <div className="dashboard-section-header">
                <h3>Match History</h3>
                <span className="history-count-text">
                  {totalGames} recorded matches
                </span>
              </div>

              {loading ? (
                <div className="leaderboard-loading-skeleton">
                  <div className="skeleton-row" />
                  <div className="skeleton-row" />
                  <div className="skeleton-row" />
                </div>
              ) : error ? (
                <div className="leaderboard-state-view">
                  <span className="state-icon" aria-hidden="true">⚠️</span>
                  <p className="state-msg">{error}</p>
                </div>
              ) : history.length === 0 ? (
                <div className="leaderboard-state-view">
                  <span className="state-icon" aria-hidden="true">🎮</span>
                  <p className="state-msg">No completed matches yet.</p>
                  <span className="state-sub">Play a match to record your career telemetry!</span>
                </div>
              ) : (
                <div className="history-table-wrapper">
                  <table className="history-table" aria-label="Completed match sessions">
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Score</th>
                        <th scope="col">Lines</th>
                        <th scope="col">Max Combo</th>
                        <th scope="col">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.sessionId}>
                          <td className="history-date">{formatDate(item.completedAt)}</td>
                          <td className="history-score tabular-nums font-mono">
                            <strong>{item.score.toLocaleString()}</strong>
                            {item.status === 'flagged' && (
                              <small aria-label="Under review"> Under review</small>
                            )}
                          </td>
                          <td className="history-lines tabular-nums font-mono">{item.linesCleared}</td>
                          <td className="history-combo tabular-nums font-mono">x{item.highestCombo ?? 1}</td>
                          <td className="history-time tabular-nums font-mono">{formatDuration(item.duration)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* History Pagination */}
              {totalPages > 1 && (
                <div className="pagination-group history-pagination">
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous history page"
                  >
                    ← Prev
                  </button>
                  <span className="page-indicator tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next history page"
                  >
                    Next →
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Honest Guest Mode Screen */
          <div className="dashboard-guest-view">
            <div className="guest-hero-icon" aria-hidden="true">👤</div>
            <h3>Playing as Guest</h3>
            <p className="guest-explanation">
              Sign in to track your match history and records across devices.
              To save your permanent stats, track complete match history, and compete on the global leaderboard, create a free player account!
            </p>

            <div className="guest-action-group">
              <button
                type="button"
                className="primary-button btn-large animate-pulse-glow"
                onClick={() => {
                  onClose()
                  onOpenAuth()
                }}
              >
                Sign In / Register Account
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                Continue as Guest
              </button>
            </div>
          </div>
        )}

        <footer className="modal-footer">
          <button className="primary-button btn-sm" type="button" onClick={onClose}>
            Close Dashboard
          </button>
        </footer>
      </div>
    </div>
  )
}
