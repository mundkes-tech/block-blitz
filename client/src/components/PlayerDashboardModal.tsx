import { useEffect, useState } from 'react'
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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    if (!currentUser?.id) {
      setStats(null)
      setHistory([])
      return
    }

    setLoading(true)
    Promise.all([
      fetchGameSessionStats(currentUser.id),
      fetchGameSessionHistory(1, 15, currentUser.id),
    ])
      .then(([statsData, historyData]) => {
        setStats(statsData)
        setHistory(historyData.items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, currentUser?.id])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dashboard-title">
      <div className="modal-card dashboard-card">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">CAREER OVERVIEW</span>
            <h2 id="dashboard-title">📊 PLAYER DASHBOARD</h2>
          </div>
          <button className="icon-close-btn" type="button" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        {currentUser ? (
          <>
            {/* Player Profile Banner */}
            <div className="profile-info-banner">
              <div className="profile-avatar">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="profile-meta">
                <h3>{currentUser.name}</h3>
                <p>{currentUser.email}</p>
              </div>
              <button
                type="button"
                className="dashboard-signout-btn"
                onClick={() => {
                  onLogout()
                  onClose()
                }}
                title="Sign out of account"
              >
                Sign Out
              </button>
            </div>

            {/* Metric Cards */}
            <div className="dashboard-metrics-grid">
              <div className="metric-box">
                <span className="metric-label">BEST SCORE</span>
                <strong className="metric-number text-accent">
                  {(currentUser.highestScore ?? stats?.highestScore ?? 0).toLocaleString()}
                </strong>
              </div>
              <div className="metric-box">
                <span className="metric-label">TOTAL GAMES</span>
                <strong className="metric-number">
                  {currentUser.totalGames ?? stats?.totalCompletedGames ?? 0}
                </strong>
              </div>
              <div className="metric-box">
                <span className="metric-label">LINES CLEARED</span>
                <strong className="metric-number text-teal">
                  {(currentUser.totalLinesCleared ?? stats?.totalLinesCleared ?? 0).toLocaleString()}
                </strong>
              </div>
              <div className="metric-box">
                <span className="metric-label">BEST COMBO</span>
                <strong className="metric-number text-amber">
                  {currentUser.highestCombo ? `x${currentUser.highestCombo}` : 'x0'}
                </strong>
              </div>
            </div>

            {/* Game History Table */}
            <div className="dashboard-history-section">
              <div className="section-title-row">
                <h3>RECENT MATCH HISTORY</h3>
                <span className="history-count">{history.length} completed sessions</span>
              </div>

              {loading && <p className="loading-state">Loading your match history…</p>}

              {!loading && history.length === 0 && (
                <p className="empty-state">
                  No completed games recorded yet. Play a match to start building your record!
                </p>
              )}

              {!loading && history.length > 0 && (
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Score</th>
                        <th>Lines</th>
                        <th>Combo</th>
                        <th>Blocks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((game) => {
                        const dateFormatted = new Date(game.completedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        return (
                          <tr key={game.sessionId}>
                            <td>{dateFormatted}</td>
                            <td className="score-cell">{game.score.toLocaleString()}</td>
                            <td>{game.linesCleared}</td>
                            <td>{game.highestCombo ? `x${game.highestCombo}` : 'x1'}</td>
                            <td>{game.blocksPlaced ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Guest State Banner */
          <div className="dashboard-guest-card">
            <div className="guest-icon">👤</div>
            <h3>Playing as Guest</h3>
            <p>
              Sign in or create a player account to record your match history, climb the live global leaderboard, and save your personal achievements permanently.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                onClose()
                onOpenAuth()
              }}
            >
              🔐 Sign In / Create Account
            </button>
          </div>
        )}

        <footer className="modal-footer">
          <button className="primary-button" type="button" onClick={onClose}>
            Close Dashboard
          </button>
        </footer>
      </div>
    </div>
  )
}
