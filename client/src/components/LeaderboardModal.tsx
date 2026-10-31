import { useEffect, useRef, useState } from 'react'
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

type Timeframe = 'all' | 'daily' | 'weekly'

export function LeaderboardModal({
  isOpen,
  onClose,
  currentUserId,
}: LeaderboardModalProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myRank, setMyRank] = useState<{ rank: number; highestScore: number } | null>(null)

  const activeRequestRef = useRef(0)
  const modalCardRef = useRef<HTMLDivElement>(null)

  // Escape key closes modal & focus trapping
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

  // Data fetching with race-condition prevention
  useEffect(() => {
    if (!isOpen) return

    const requestId = ++activeRequestRef.current

    // Set loading asynchronously
    const timer = setTimeout(() => {
      if (activeRequestRef.current === requestId) {
        setLoading(true)
      }
    }, 0)

    fetchLeaderboard(page, 10, timeframe)
      .then((res) => {
        if (activeRequestRef.current === requestId) {
          setEntries(res.items)
          setTotalPages(res.pagination.totalPages || 1)
          setTotalEntries(res.pagination.total || 0)
          setError(null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (activeRequestRef.current === requestId) {
          setError('Could not connect to the leaderboard service.')
          setLoading(false)
        }
      })

    if (currentUserId) {
      fetchMyRank()
        .then((rankData) => {
          if (activeRequestRef.current === requestId) {
            setMyRank(rankData)
          }
        })
        .catch(() => {})
    }

    return () => {
      clearTimeout(timer)
    }
  }, [isOpen, timeframe, page, currentUserId])

  if (!isOpen) return null

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf)
    setPage(1)
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    fetchLeaderboard(page, 10, timeframe)
      .then((res) => {
        setEntries(res.items)
        setTotalPages(res.pagination.totalPages || 1)
        setTotalEntries(res.pagination.total || 0)
      })
      .catch(() => {
        setError('Could not connect to the leaderboard service.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card leaderboard-card animate-scale-up" ref={modalCardRef}>
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">GLOBAL COMPETITION</span>
            <h2 id="leaderboard-title">🏆 LEADERBOARD</h2>
          </div>
          <button
            className="icon-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close leaderboard modal"
          >
            ✕
          </button>
        </header>

        {/* Timeframe Tab Switcher */}
        <div className="leaderboard-tabs" role="tablist" aria-label="Leaderboard timeframe">
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'all'}
            className={`tab-btn${timeframe === 'all' ? ' tab-btn--active' : ''}`}
            onClick={() => handleTimeframeChange('all')}
          >
            All-Time
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'daily'}
            className={`tab-btn${timeframe === 'daily' ? ' tab-btn--active' : ''}`}
            onClick={() => handleTimeframeChange('daily')}
          >
            Today's Best
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'weekly'}
            className={`tab-btn${timeframe === 'weekly' ? ' tab-btn--active' : ''}`}
            onClick={() => handleTimeframeChange('weekly')}
          >
            This Week
          </button>
        </div>

        {/* User's Standings Banner */}
        {myRank && (
          <div className="my-rank-banner" role="status">
            <span>YOUR BEST STANDING</span>
            <strong>
              Rank #{myRank.rank} • {myRank.highestScore.toLocaleString()} pts
            </strong>
          </div>
        )}

        {/* Main Content Area */}
        <div className="leaderboard-body" aria-live="polite">
          {loading ? (
            <div className="leaderboard-loading-skeleton">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          ) : error ? (
            <div className="leaderboard-state-view">
              <span className="state-icon" aria-hidden="true">⚠️</span>
              <p className="state-msg">{error}</p>
              <button
                type="button"
                className="primary-button btn-sm"
                onClick={handleRetry}
              >
                Retry
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="leaderboard-state-view">
              <span className="state-icon" aria-hidden="true">🎯</span>
              <p className="state-msg">No scores logged yet for this timeframe.</p>
              <span className="state-sub">Complete a match to take first place!</span>
            </div>
          ) : (
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table" aria-label="High scores rankings">
                <thead>
                  <tr>
                    <th scope="col" className="th-rank">Rank</th>
                    <th scope="col" className="th-player">Player</th>
                    <th scope="col" className="th-lines">Lines</th>
                    <th scope="col" className="th-score">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isMe =
                      (currentUserId && entry.userId === currentUserId) ||
                      entry.playerName.includes('You')
                    return (
                      <tr
                        key={`${entry.rank}-${entry.playerName}-${entry.score}`}
                        className={isMe ? 'tr-me' : ''}
                      >
                        <td className="td-rank">
                          <span className={`rank-pill rank-pill--${entry.rank}`}>
                            {entry.rank === 1
                              ? '🥇 1'
                              : entry.rank === 2
                                ? '🥈 2'
                                : entry.rank === 3
                                  ? '🥉 3'
                                  : `#${entry.rank}`}
                          </span>
                        </td>
                        <td className="td-player">
                          <span className="player-name-text">{entry.playerName}</span>
                          {isMe && <span className="mini-badge-you">YOU</span>}
                        </td>
                        <td className="td-lines tabular-nums font-mono">{entry.linesCleared}</td>
                        <td className="td-score">
                          <strong className="score-val tabular-nums font-mono">
                            {entry.score.toLocaleString()}
                          </strong>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <footer className="modal-footer leaderboard-footer">
          <div className="pagination-group">
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <span className="page-indicator tabular-nums">
              Page {page} of {Math.max(1, totalPages)} ({totalEntries} total)
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>

          <button className="primary-button btn-sm" type="button" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
