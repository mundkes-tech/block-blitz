import { AnimatedNumber } from '../ui/primitives'
import type { UserProfile } from '../services/gameSessionsApi'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'unavailable' | 'error'

type GameOverModalProps = {
  score: number
  bestScore: number
  isNewBest: boolean
  linesCleared: number
  highestCombo: number
  blocksPlaced: number
  durationSeconds: number
  saveStatus?: SaveStatus
  currentUser?: UserProfile | null
  onPlayAgain: () => void
  onOpenLeaderboard: () => void
  onOpenDashboard: () => void
  onOpenAuth?: () => void
  onHome: () => void
  onRetrySave?: () => void
}

export function GameOverModal({
  score,
  bestScore,
  isNewBest,
  linesCleared,
  highestCombo,
  blocksPlaced,
  durationSeconds,
  saveStatus = 'idle',
  currentUser,
  onPlayAgain,
  onOpenLeaderboard,
  onOpenDashboard,
  onOpenAuth,
  onHome,
  onRetrySave,
}: GameOverModalProps) {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  return (
    <div
      className="game-over-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <div className="game-over-card animate-scale-up">
        {isNewBest && (
          <div className="new-best-banner animate-bounce-subtle" role="status">
            <span className="trophy" aria-hidden="true">🏆</span>
            <strong>NEW ALL-TIME RECORD!</strong>
          </div>
        )}

        <header className="game-over-header">
          <p className="eyebrow">NO MORE MOVES REMAINING</p>
          <h2 id="gameover-title" className="game-over-title">MATCH COMPLETE</h2>
        </header>

        {/* Hero Score Display with Tabular Count-Up */}
        <div className="game-over-score-hero">
          <span className="hero-score-label">FINAL SCORE</span>
          <div className="hero-score-value">
            <AnimatedNumber value={score} durationMs={280} />
          </div>
          <span className="hero-best-label">
            Personal Record:{' '}
            <strong className="tabular-nums font-mono">{bestScore.toLocaleString()}</strong>
          </span>
        </div>

        {/* Honest Save Status Indicator */}
        <div className="game-over-save-status" aria-live="polite">
          {saveStatus === 'saving' && (
            <span className="save-indicator save-indicator--saving">
              <span className="save-spinner" aria-hidden="true" />
              <span>Saving match result…</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="save-indicator save-indicator--saved">
              <span aria-hidden="true">✓</span>
              <span>Result synced to server</span>
            </span>
          )}
          {saveStatus === 'unavailable' && (
            <span className="save-indicator save-indicator--local">
              <span aria-hidden="true">💾</span>
              <span>Saved locally (Server offline)</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="save-indicator save-indicator--error">
              <span aria-hidden="true">⚠️</span>
              <span>Failed to save result</span>
              {onRetrySave && (
                <button
                  type="button"
                  className="save-retry-btn"
                  onClick={onRetrySave}
                >
                  Retry
                </button>
              )}
            </span>
          )}
        </div>

        {/* Detailed Match Telemetry Grid */}
        <div className="game-over-stats-grid">
          <div className="stat-pill">
            <span className="stat-pill-label">Lines Cleared</span>
            <strong className="tabular-nums font-mono">{linesCleared}</strong>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Max Streak</span>
            <strong className="tabular-nums font-mono">x{highestCombo}</strong>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Blocks Placed</span>
            <strong className="tabular-nums font-mono">{blocksPlaced}</strong>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Match Time</span>
            <strong className="tabular-nums font-mono">{formatTime(durationSeconds)}</strong>
          </div>
        </div>

        {/* Guest conversion banner if not signed in */}
        {!currentUser && score > 0 && onOpenAuth && (
          <div
            className="game-over-guest-banner"
            onClick={onOpenAuth}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenAuth()
              }
            }}
            title="Save your high score to global leaderboards by creating an account"
          >
            <span>
              ⭐ <strong>Compete globally!</strong> Sign in or register to record your score on the leaderboard →
            </span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="game-over-actions">
          <button
            className="primary-button btn-large w-full animate-pulse-glow"
            type="button"
            onClick={onPlayAgain}
            autoFocus
          >
            ▶ Play Again
          </button>

          <div className="secondary-button-row">
            <button className="secondary-button" type="button" onClick={onOpenLeaderboard}>
              🏆 Leaderboard
            </button>
            <button className="secondary-button" type="button" onClick={onOpenDashboard}>
              📊 Career Stats
            </button>
            <button className="secondary-button secondary-button--home" type="button" onClick={onHome}>
              ← Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
