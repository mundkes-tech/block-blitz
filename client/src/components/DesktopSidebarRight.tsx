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
  rerollsLeft: number
  hammersLeft: number
  undosLeft: number
  hammerActive: boolean
  onUseReroll: () => void
  onToggleHammer: () => void
  onUseUndo: () => void
  canUndo: boolean
  locked?: boolean
}

export function DesktopSidebarRight({
  currentUserId,
  matchLogs,
  onOpenLeaderboard,
  rerollsLeft,
  hammersLeft,
  undosLeft,
  hammerActive,
  onUseReroll,
  onToggleHammer,
  onUseUndo,
  canUndo,
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
      aria-label="Tactical boosters, leaderboard, and match event feed"
    >
      <div className="sidebar-card boosters-sidebar-card">
        <header className="sidebar-card-header">
          <div className="dock-title-group">
            <span className="eyebrow">TACTICAL BOOSTERS</span>
            <span className="dock-subhead">In-game power-ups</span>
          </div>
          <span className="badge-bonus" aria-hidden="true">POWER-UPS</span>
        </header>
        {hammerActive && (
          <div className="hammer-active-callout animate-pulse" role="alert">
            <span className="hammer-callout-icon" aria-hidden="true">🔨</span>
            <span className="hammer-callout-text"><strong>Hammer active</strong><span>Choose a block</span></span>
            <button type="button" className="hammer-cancel-pill" onClick={onToggleHammer}>Cancel</button>
          </div>
        )}
        <div className="boosters-list" role="group" aria-label="Available boosters">
          <button type="button" className={`booster-item-btn${rerollsLeft === 0 || locked ? ' booster-item-btn--disabled' : ''}`} onClick={onUseReroll} disabled={rerollsLeft === 0 || locked}>
            <span className="booster-icon" aria-hidden="true">🔄</span>
            <span className="booster-text"><strong>Reroll Tray</strong><span>Redraw pieces</span></span>
            <span className="booster-qty">{rerollsLeft} left</span>
          </button>
          <button type="button" className={`booster-item-btn${hammersLeft === 0 || locked ? ' booster-item-btn--disabled' : ''}${hammerActive ? ' booster-item-btn--active' : ''}`} onClick={onToggleHammer} disabled={hammersLeft === 0 || locked} aria-pressed={hammerActive}>
            <span className="booster-icon" aria-hidden="true">🔨</span>
            <span className="booster-text"><strong>Hammer Smash</strong><span>{hammerActive ? 'Choose a block' : 'Clear one block'}</span></span>
            <span className="booster-qty">{hammersLeft} left</span>
          </button>
          <button type="button" className={`booster-item-btn${!canUndo || undosLeft === 0 || locked ? ' booster-item-btn--disabled' : ''}`} onClick={onUseUndo} disabled={!canUndo || undosLeft === 0 || locked}>
            <span className="booster-icon" aria-hidden="true">↩️</span>
            <span className="booster-text"><strong>Undo Move</strong><span>{canUndo ? 'Step back once' : 'Make a move first'}</span></span>
            <span className="booster-qty">{undosLeft} left</span>
          </button>
        </div>
      </div>

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
        </header>

        <div className="matchlog-list" role="log" aria-label="Recent match actions">
          {matchLogs.length === 0 ? (
            <p className="sidebar-hint">Clear lines to trigger combo events. Clearing multiple lines unleashes combo streaks!</p>
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
