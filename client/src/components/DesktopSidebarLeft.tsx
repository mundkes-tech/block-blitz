type DesktopSidebarLeftProps = {
  currentLinesCleared: number
  targetLines?: number
  rerollsLeft: number
  hammersLeft: number
  undosLeft: number
  hammerActive: boolean
  onUseReroll: () => void
  onToggleHammer: () => void
  onUseUndo: () => void
  canUndo: boolean
  onOpenChallenge: () => void
}

export function DesktopSidebarLeft({
  currentLinesCleared,
  targetLines = 10,
  rerollsLeft,
  hammersLeft,
  undosLeft,
  hammerActive,
  onUseReroll,
  onToggleHammer,
  onUseUndo,
  canUndo,
  onOpenChallenge,
}: DesktopSidebarLeftProps) {
  const challengeProgress = Math.min(100, Math.round((currentLinesCleared / targetLines) * 100))
  const isChallengeDone = currentLinesCleared >= targetLines

  return (
    <aside className="desktop-sidebar desktop-sidebar--left" aria-label="Tactical boosters and daily challenges">

      {/* Power-Up Boosters (Section 47 Bonus Features) */}
      <div className="sidebar-card boosters-sidebar-card">
        <div className="sidebar-card-header">
          <span className="eyebrow">TACTICAL BOOSTERS</span>
          <span className="badge-bonus">BONUS</span>
        </div>
        <p className="sidebar-card-desc">Use game power-ups when facing tricky board layouts:</p>

        <div className="boosters-list">
          {/* Reroll */}
          <button
            type="button"
            className={`booster-item-btn${rerollsLeft === 0 ? ' booster-item-btn--disabled' : ''}`}
            onClick={onUseReroll}
            disabled={rerollsLeft === 0}
            title="Redraw 3 new pieces"
          >
            <span className="booster-icon">🔄</span>
            <div className="booster-text">
              <strong>Reroll Tray</strong>
              <span>New pieces</span>
            </div>
            <span className="booster-qty">{rerollsLeft} left</span>
          </button>

          {/* Hammer */}
          <button
            type="button"
            className={`booster-item-btn${hammersLeft === 0 ? ' booster-item-btn--disabled' : ''}${
              hammerActive ? ' booster-item-btn--active' : ''
            }`}
            onClick={onToggleHammer}
            disabled={hammersLeft === 0}
            title="Smash any 1 occupied cell"
          >
            <span className="booster-icon">🔨</span>
            <div className="booster-text">
              <strong>Hammer Smash</strong>
              <span>{hammerActive ? 'Select cell…' : 'Clear 1 block'}</span>
            </div>
            <span className="booster-qty">{hammersLeft} left</span>
          </button>

          {/* Undo */}
          <button
            type="button"
            className={`booster-item-btn${!canUndo || undosLeft === 0 ? ' booster-item-btn--disabled' : ''}`}
            onClick={onUseUndo}
            disabled={!canUndo || undosLeft === 0}
            title="Revert the last placed block"
          >
            <span className="booster-icon">↩️</span>
            <div className="booster-text">
              <strong>Undo Move</strong>
              <span>Take back move</span>
            </div>
            <span className="booster-qty">{undosLeft} left</span>
          </button>
        </div>
      </div>

      {/* Daily Challenge Widget */}
      <div className="sidebar-card challenge-sidebar-card" onClick={onOpenChallenge} role="button" tabIndex={0} title="Click to view daily mission details">
        <div className="sidebar-card-header">
          <span className="eyebrow">DAILY MISSION</span>
          <span className="mission-icon">{isChallengeDone ? '🏆' : '🎯'}</span>
        </div>
        <h4>Clear {targetLines} Lines Today</h4>
        <div className="sidebar-progress-track">
          <div className="sidebar-progress-fill" style={{ width: `${challengeProgress}%` }} />
        </div>
        <div className="sidebar-progress-label">
          <span>{Math.min(currentLinesCleared, targetLines)} / {targetLines} Lines</span>
          <strong>{isChallengeDone ? 'COMPLETED! 🎉' : `${challengeProgress}%`}</strong>
        </div>
      </div>
    </aside>
  )
}
