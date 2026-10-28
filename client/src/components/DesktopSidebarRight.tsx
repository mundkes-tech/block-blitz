import { useEffect, useState } from 'react'
import { fetchLeaderboard, type LeaderboardEntry } from '../services/gameSessionsApi'

export type MatchLogEntry = {
  id: number
  text: string
  subtext?: string
  color?: string
}

type DesktopSidebarRightProps = {
  currentUserId?: string | null
  matchLogs: MatchLogEntry[]
  onOpenLeaderboard: () => void
  locked?: boolean
}

export function DesktopSidebarRight({
  currentUserId,
  matchLogs,
  onOpenLeaderboard,
  locked = false,
}: DesktopSidebarRightProps) {
  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    fetchLeaderboard(1, 5, 'all')
      .then((res) => {
        if (active) {
          setTopEntries(res.items)
          setError(null)
        }
      })
      .catch(() => {
        if (active) {
          setError('Leaderboard offline')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <aside
      className={`desktop-sidebar desktop-sidebar--right${locked ? ' desktop-sidebar--locked' : ''}`}
      aria-label="Global leaderboard and match event feed"
    >
      {/* Live Mini Leaderboard Card */}
      <div className="sidebar-card leaderboard-sidebar-card">
        <header className="sidebar-card-header">
          <div className="dock-title-group">
            <span className="eyebrow">GLOBAL ARENA</span>
            <span className="dock-subhead">Top Blitzers</span>
          </div>
          <button
            className="sidebar-link-btn"
            type="button"
            onClick={onOpenLeaderboard}
            aria-label="View full leaderboard"
          >
            All Ranks →
          </button>
        </header>

        {loading ? (
          <div className="mini-leaderboard-loading">
            <div className="sidebar-skeleton-row" />
            <div className="sidebar-skeleton-row" />
            <div className="sidebar-skeleton-row" />
          </div>
        ) : error ? (
          <p className="sidebar-hint text-amber-400">{error}</p>
        ) : topEntries.length === 0 ? (
          <p className="sidebar-hint">No high scores recorded yet. Be the first!</p>
        ) : (
          <div className="mini-leaderboard-list" role="list">
            {topEntries.map((entry) => {
              const isMe =
                (currentUserId && entry.userId === currentUserId) ||
                entry.playerName.includes('You')
              return (
                <div
                  key={`${entry.rank}-${entry.score}-${entry.playerName}`}
                  className={`mini-leaderboard-item${isMe ? ' mini-leaderboard-item--me' : ''}`}
                  role="listitem"
                >
                  <span className="mini-rank" aria-label={`Rank ${entry.rank}`}>
                    {entry.rank === 1
                      ? '🥇'
                      : entry.rank === 2
                        ? '🥈'
                        : entry.rank === 3
                          ? '🥉'
                          : `#${entry.rank}`}
                  </span>
                  <span className="mini-player-name">
                    {entry.playerName}
                    {isMe && <span className="mini-badge-you">YOU</span>}
                  </span>
                  <strong className="mini-score tabular-nums font-mono">
                    {entry.score.toLocaleString()}
                  </strong>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Live Match Action Log Card */}
      <div className="sidebar-card matchlog-sidebar-card">
        <header className="sidebar-card-header">
          <div className="dock-title-group">
            <span className="eyebrow">MATCH TELEMETRY</span>
            <span className="dock-subhead">Live Action Feed</span>
          </div>
          <span className="telemetry-live-dot" aria-live="polite">● LIVE</span>
        </header>

        <div className="matchlog-list" role="log" aria-label="Recent match actions">
          {matchLogs.length === 0 ? (
            <p className="sidebar-hint">Place blocks and clear rows/columns to trigger combo events.</p>
          ) : (
            matchLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="matchlog-item animate-fade-in">
                <span
                  className="matchlog-dot"
                  style={{ backgroundColor: log.color ?? '#10b981' }}
                  aria-hidden="true"
                />
                <div className="matchlog-content">
                  <strong>{log.text}</strong>
                  {log.subtext && <span>{log.subtext}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
