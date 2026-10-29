type DesktopSidebarLeftProps = {
  currentLinesCleared: number
  targetLines?: number
  onOpenChallenge: () => void
  onNewGame?: () => void
  onHome?: () => void
  score: number
  bestScore: number
  saveStatus: string
  combo?: number
  locked?: boolean
}

export function DesktopSidebarLeft({
  currentLinesCleared,
  targetLines = 10,
  onOpenChallenge,
  onNewGame,
  onHome,
  score,
  bestScore,
  saveStatus,
  combo,
  locked = false,
}: DesktopSidebarLeftProps) {
  const challengeProgress = Math.min(100, Math.round((currentLinesCleared / targetLines) * 100))
  const isChallengeDone = currentLinesCleared >= targetLines

  return (
    <aside
      className={`desktop-sidebar desktop-sidebar--left${locked ? ' desktop-sidebar--locked' : ''}`}
      aria-label="Run statistics, daily mission, and match controls"
    >
      <div className="sidebar-stat-grid" aria-label="Current run statistics">
        <div key={score} className="sidebar-stat-card sidebar-stat-card--score">
          <span className="eyebrow">SCORE</span>
          <strong>{score.toLocaleString()}</strong>
        </div>
        <div className="sidebar-stat-card">
          <span className="eyebrow">BEST RECORD</span>
          <strong>{bestScore.toLocaleString()}</strong>
        </div>
        <div className="sidebar-stat-card">
          <span className="eyebrow">LINES</span>
          <strong>{currentLinesCleared}</strong>
        </div>
        <div className="sidebar-stat-card sidebar-stat-card--status">
          <span className="eyebrow">STATUS</span>
          <strong>{saveStatus === 'saved' ? 'Synced' : saveStatus === 'saving' ? 'Syncing' : 'Ready'}</strong>
        </div>
      </div>

      {/* Daily Mission Widget */}
      <div
        className="sidebar-card challenge-sidebar-card"
        onClick={onOpenChallenge}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenChallenge()
          }
        }}
        title="Click to view daily mission details"
        aria-label="Daily challenge mission card"
      >
        <header className="sidebar-card-header">
          <div className="dock-title-group">
            <span className="eyebrow">DAILY MISSION</span>
            <span className="dock-subhead">Clear {targetLines} Lines</span>
          </div>
          <span className="mission-icon" aria-hidden="true">{isChallengeDone ? '🏆' : '🎯'}</span>
        </header>

        <div className="sidebar-progress-container">
          <div className="sidebar-progress-track" role="progressbar" aria-valuenow={currentLinesCleared} aria-valuemin={0} aria-valuemax={targetLines} aria-label="Daily challenge progress">
            <div
              className={`sidebar-progress-fill${isChallengeDone ? ' sidebar-progress-fill--complete' : ''}`}
              style={{ width: `${challengeProgress}%` }}
            />
          </div>
          <div className="sidebar-progress-labels">
            <span>Progress: {Math.min(currentLinesCleared, targetLines)} / {targetLines}</span>
            <strong className="progress-percent-text">{challengeProgress}%</strong>
          </div>
        </div>

        {isChallengeDone ? (
          <div className="challenge-complete-tag">
            <span>✓ Daily Mission Complete!</span>
          </div>
        ) : (
          <p className="sidebar-hint">
            {targetLines - currentLinesCleared} lines to unlock today's bonus badge.
          </p>
        )}
      </div>

      {(onNewGame || onHome) && (
        <div className="sidebar-card session-controls-card">
          <header className="sidebar-card-header">
            <span className="eyebrow">MATCH CONTROLS</span>
            {combo !== undefined && combo > 1 && <span className="badge-bonus">🔥 {combo}× COMBO</span>}
          </header>
          <div className="session-actions-grid">
            {onNewGame && <button type="button" className="session-action-btn session-action-btn--restart" onClick={onNewGame} disabled={locked}>🔄 <span>Restart Run</span></button>}
            {onHome && <button type="button" className="session-action-btn session-action-btn--home" onClick={onHome}>🏠 <span>Exit Home</span></button>}
          </div>
        </div>
      )}
    </aside>
  )
}
