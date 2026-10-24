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
}

export function DesktopSidebarRight({
  currentUserId,
  matchLogs,
  onOpenLeaderboard,
}: DesktopSidebarRightProps) {
  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchLeaderboard(1, 5, 'all')
      .then((res) => setTopEntries(res.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <aside className="desktop-sidebar desktop-sidebar--right" aria-label="Global leaderboard and match event log">
      {/* Live Mini Leaderboard Card */}
      <div className="sidebar-card leaderboard-sidebar-card">
        <div className="sidebar-card-header">
          <span className="eyebrow">GLOBAL ARENA</span>
          <button className="sidebar-link-btn" type="button" onClick={onOpenLeaderboard}>
            View All →
          </button>
        </div>
        <h4>🏆 Top Blitzer Ranks</h4>

        {loading && <p className="sidebar-hint">Loading ranks…</p>}

        <div className="mini-leaderboard-list">
          {topEntries.map((entry) => {
            const isMe =
              (currentUserId && entry.userId === currentUserId) ||
              entry.playerName.includes('You')
            return (
              <div
                key={`${entry.rank}-${entry.score}`}
                className={`mini-leaderboard-item${isMe ? ' mini-leaderboard-item--me' : ''}`}
              >
                <span className="mini-rank">
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </span>
                <span className="mini-player-name">
                  {entry.playerName}
                  {isMe && <span className="mini-badge-you">YOU</span>}
                </span>
                <strong className="mini-score">{entry.score.toLocaleString()}</strong>
              </div>
            )
          })}
        </div>
      </div>

      {/* Live Match Log Card */}
      <div className="sidebar-card matchlog-sidebar-card">
        <div className="sidebar-card-header">
          <span className="eyebrow">MATCH TELEMETRY</span>
          <span className="telemetry-live-dot">● LIVE</span>
        </div>
        <h4>Action Feed</h4>

        <div className="matchlog-list">
          {matchLogs.length === 0 ? (
            <p className="sidebar-hint">Place blocks and clear lines to see real-time match events.</p>
          ) : (
            matchLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="matchlog-item">
                <span className="matchlog-dot" style={{ backgroundColor: log.color ?? '#10b981' }} />
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
