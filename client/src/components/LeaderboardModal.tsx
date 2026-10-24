import { useEffect, useState } from 'react'
import {
  fetchLeaderboard,
  fetchMyRank,
  type LeaderboardEntry,
} from '../services/gameSessionsApi'

type LeaderboardModalProps = {
  isOpen: boolean
  onClose: () => void
  currentUserId?: string | null
}

type Timeframe = 'all' | 'daily' | 'weekly' | 'monthly'

export function LeaderboardModal({
  isOpen,
  onClose,
  currentUserId,
}: LeaderboardModalProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('all')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myRank, setMyRank] = useState<{ rank: number; highestScore: number } | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    setError(null)

    fetchLeaderboard(1, 20, timeframe)
      .then((res) => {
        setEntries(res.items)
      })
      .catch(() => {
        setError('Failed to load global leaderboard')
      })
      .finally(() => {
        setLoading(false)
      })

    if (currentUserId) {
      fetchMyRank(currentUserId).then(setMyRank).catch(() => {})
    }
  }, [isOpen, timeframe, currentUserId])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
      <div className="modal-card leaderboard-card">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">GLOBAL RANKINGS</span>
            <h2 id="leaderboard-title">🏆 BLOCK BLITZ LEADERBOARD</h2>
          </div>
          <button className="icon-close-btn" type="button" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        {/* Timeframe tabs: Section 32 Mandatory (All-Time) & Bonus (Daily, Weekly, Monthly) */}
        <div className="leaderboard-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'all'}
            className={`tab-btn${timeframe === 'all' ? ' tab-btn--active' : ''}`}
            onClick={() => setTimeframe('all')}
          >
            All-Time
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'daily'}
            className={`tab-btn${timeframe === 'daily' ? ' tab-btn--active' : ''}`}
            onClick={() => setTimeframe('daily')}
          >
            Today's Best
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'weekly'}
            className={`tab-btn${timeframe === 'weekly' ? ' tab-btn--active' : ''}`}
            onClick={() => setTimeframe('weekly')}
          >
            This Week
          </button>
        </div>

        {myRank && (
          <div className="my-rank-banner">
            <span>YOUR BEST STANDING</span>
            <strong>
              Rank #{myRank.rank} • {myRank.highestScore.toLocaleString()} pts
            </strong>
          </div>
        )}

        <div className="leaderboard-body">
          {loading && <p className="loading-state">Fetching rankings…</p>}
          {error && <p className="error-state">{error}</p>}

          {!loading && !error && entries.length === 0 && (
            <p className="empty-state">No games recorded for this timeframe yet!</p>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="leaderboard-table-container">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Lines</th>
                    <th>Combo</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isCurrent =
                      (currentUserId && entry.userId === currentUserId) ||
                      (entry.playerName && entry.playerName.includes('You'))
                    return (
                      <tr
                        key={`${entry.rank}-${entry.score}-${entry.completedAt}`}
                        className={isCurrent ? 'leaderboard-row--current' : ''}
                      >
                        <td className="rank-cell">
                          {entry.rank === 1 && <span className="medal">🥇</span>}
                          {entry.rank === 2 && <span className="medal">🥈</span>}
                          {entry.rank === 3 && <span className="medal">🥉</span>}
                          {entry.rank > 3 && <span className="rank-number">#{entry.rank}</span>}
                        </td>
                        <td className="player-cell">
                          <strong>{entry.playerName}</strong>
                          {isCurrent && <span className="badge-you">YOU</span>}
                        </td>
                        <td className="score-cell">{entry.score.toLocaleString()}</td>
                        <td>{entry.linesCleared}</td>
                        <td>{entry.highestCombo ? `${entry.highestCombo}x` : '—'}</td>
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
            Back to Game
          </button>
        </footer>
      </div>
    </div>
  )
}
