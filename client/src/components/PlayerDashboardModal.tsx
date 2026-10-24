import { useEffect, useState } from 'react'
import {
  fetchGameSessionHistory,
  fetchGameSessionStats,
  fetchUsers,
  type GameSessionHistoryItem,
  type GameSessionStats,
  type UserProfile,
} from '../services/gameSessionsApi'

type PlayerDashboardModalProps = {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  onSwitchUser: (user: UserProfile) => void
}

export function PlayerDashboardModal({
  isOpen,
  onClose,
  currentUserId,
  onSwitchUser,
}: PlayerDashboardModalProps) {
  const [stats, setStats] = useState<GameSessionStats | null>(null)
  const [history, setHistory] = useState<GameSessionHistoryItem[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    Promise.all([
      fetchUsers(),
      fetchGameSessionStats(currentUserId),
      fetchGameSessionHistory(1, 15, currentUserId),
    ])
      .then(([userList, statsData, historyData]) => {
        setUsers(userList)
        setStats(statsData)
        setHistory(historyData.items)
        const match = userList.find((u) => u.id === currentUserId)
        if (match) {
          setActiveProfile(match)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, currentUserId])

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

        {/* Profile Switcher / VELoop Mock SSO (Section 27 & 28) */}
        <div className="profile-select-bar">
          <label htmlFor="user-select">Active VELoop Profile:</label>
          <select
            id="user-select"
            value={currentUserId}
            onChange={(e) => {
              const selected = users.find((u) => u.id === e.target.value)
              if (selected) {
                onSwitchUser(selected)
                setActiveProfile(selected)
              }
            }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        {/* Player Profile Card (Section 28) */}
        <div className="profile-info-banner">
          <div className="profile-avatar">
            {activeProfile?.name ? activeProfile.name.charAt(0).toUpperCase() : 'P'}
          </div>
          <div className="profile-meta">
            <h3>{activeProfile?.name ?? 'Player'}</h3>
            <p>{activeProfile?.email ?? 'player@veloop.dev'}</p>
          </div>
        </div>

        {/* Metric Cards (Section 28) */}
        <div className="dashboard-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">BEST SCORE</span>
            <strong className="metric-number text-accent">
              {(activeProfile?.highestScore ?? stats?.highestScore ?? 0).toLocaleString()}
            </strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">TOTAL GAMES</span>
            <strong className="metric-number">
              {activeProfile?.totalGames ?? stats?.totalCompletedGames ?? 0}
            </strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">LINES CLEARED</span>
            <strong className="metric-number text-teal">
              {(activeProfile?.totalLinesCleared ?? stats?.totalLinesCleared ?? 0).toLocaleString()}
            </strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">BEST COMBO</span>
            <strong className="metric-number text-amber">
              {activeProfile?.highestCombo ? `x${activeProfile.highestCombo}` : 'x0'}
            </strong>
          </div>
        </div>

        {/* Game History Table (Section 29) */}
        <div className="dashboard-history-section">
          <div className="section-title-row">
            <h3>GAME HISTORY</h3>
            <span className="history-count">{history.length} recent sessions</span>
          </div>

          {loading && <p className="loading-state">Loading history…</p>}

          {!loading && history.length === 0 && (
            <p className="empty-state">No completed games found for this player yet. Play a game to record stats!</p>
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

        <footer className="modal-footer">
          <button className="primary-button" type="button" onClick={onClose}>
            Close Dashboard
          </button>
        </footer>
      </div>
    </div>
  )
}
