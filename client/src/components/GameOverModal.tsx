type GameOverModalProps = {
  score: number
  bestScore: number
  isNewBest: boolean
  linesCleared: number
  highestCombo: number
  blocksPlaced: number
  durationSeconds: number
  currentUser?: import('../services/gameSessionsApi').UserProfile | null
  onPlayAgain: () => void
  onOpenLeaderboard: () => void
  onOpenDashboard: () => void
  onOpenAuth?: () => void
  onHome: () => void
}

export function GameOverModal({
  score,
  bestScore,
  isNewBest,
  linesCleared,
  highestCombo,
  blocksPlaced,
  durationSeconds,
  currentUser,
  onPlayAgain,
  onOpenLeaderboard,
  onOpenDashboard,
  onOpenAuth,
  onHome,
}: GameOverModalProps) {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  return (
    <div className="game-over-overlay" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
      <div className="game-over-card">
        {isNewBest && (
          <div className="new-best-banner">
            <span className="trophy">🏆</span>
            <strong>NEW BEST RECORD!</strong>
          </div>
        )}

        <p className="eyebrow">NO MORE MOVES REMAINING</p>
        <h2 id="gameover-title">GAME OVER</h2>

        <div className="game-over-score-hero">
          <span className="hero-score-label">FINAL SCORE</span>
          <strong className="hero-score-value">{score.toLocaleString()}</strong>
          <span className="hero-best-label">
            Personal Best: <strong>{bestScore.toLocaleString()}</strong>
          </span>
        </div>

        <div className="game-over-stats-grid">
          <div className="stat-pill">
            <span className="stat-pill-label">Lines</span>
            <strong>{linesCleared}</strong>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Max Combo</span>
            <strong>x{highestCombo}</strong>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Blocks</span>
            <strong>{blocksPlaced}</strong>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Time</span>
            <strong>{formatTime(durationSeconds)}</strong>
          </div>
        </div>

        {!currentUser && score > 0 && onOpenAuth && (
          <div
            className="game-over-guest-banner"
            onClick={onOpenAuth}
            role="button"
            tabIndex={0}
            title="Save your high score by signing in"
          >
            <span>💾 <strong>Save your score to the Leaderboard!</strong> Sign in or Register for free →</span>
          </div>
        )}

        <div className="game-over-actions">
          <button className="primary-button btn-large" type="button" onClick={onPlayAgain}>
            Play Again
          </button>
          <div className="secondary-button-row">
            <button className="secondary-button" type="button" onClick={onOpenLeaderboard}>
              🏆 Leaderboard
            </button>
            <button className="secondary-button" type="button" onClick={onOpenDashboard}>
              📊 Dashboard
            </button>
            <button className="secondary-button" type="button" onClick={onHome}>
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
