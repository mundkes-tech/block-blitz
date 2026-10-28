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
  locked?: boolean
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
  locked = false,
}: DesktopSidebarLeftProps) {
  const challengeProgress = Math.min(100, Math.round((currentLinesCleared / targetLines) * 100))
  const isChallengeDone = currentLinesCleared >= targetLines

  return (
    <aside
      className={`desktop-sidebar desktop-sidebar--left${locked ? ' desktop-sidebar--locked' : ''}`}
      aria-label="Tactical boosters and daily mission"
    >
      {/* Tactical Boosters Card */}
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
            <div className="hammer-callout-text">
              <strong>Hammer Active</strong>
              <span>Click an occupied cell to clear it</span>
            </div>
            <button
              type="button"
              className="hammer-cancel-pill"
              onClick={onToggleHammer}
              title="Cancel hammer targeting (Escape)"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

        <div className="boosters-list" role="group" aria-label="Available boosters">
          {/* Reroll */}
          <button
            type="button"
            className={`booster-item-btn${rerollsLeft === 0 || locked ? ' booster-item-btn--disabled' : ''}`}
            onClick={onUseReroll}
            disabled={rerollsLeft === 0 || locked}
            title={rerollsLeft === 0 ? 'No rerolls remaining this match' : 'Redraw 3 new pieces'}
            aria-disabled={rerollsLeft === 0 || locked}
          >
            <span className="booster-icon" aria-hidden="true">🔄</span>
            <div className="booster-text">
              <div className="booster-name-row">
                <strong>Reroll Tray</strong>
                <span className="booster-qty">{rerollsLeft} left</span>
              </div>
              <span className="booster-desc">
                {rerollsLeft === 0 ? 'Exhausted' : 'Redraw fresh piece set'}
              </span>
            </div>
          </button>

          {/* Hammer */}
          <button
            type="button"
            className={`booster-item-btn${
              hammersLeft === 0 || locked ? ' booster-item-btn--disabled' : ''
            }${hammerActive ? ' booster-item-btn--active' : ''}`}
            onClick={onToggleHammer}
            disabled={hammersLeft === 0 || locked}
            aria-pressed={hammerActive}
            aria-disabled={hammersLeft === 0 || locked}
            title={hammersLeft === 0 ? 'No hammers remaining' : hammerActive ? 'Cancel hammer' : 'Clear any 1 block'}
          >
            <span className="booster-icon" aria-hidden="true">🔨</span>
            <div className="booster-text">
              <div className="booster-name-row">
                <strong>Hammer Smash</strong>
                <span className="booster-qty">{hammersLeft} left</span>
              </div>
              <span className="booster-desc">
                {hammersLeft === 0
                  ? 'Exhausted'
                  : hammerActive
                    ? 'Awaiting cell target…'
                    : 'Smash 1 occupied cell'}
              </span>
            </div>
          </button>

          {/* Undo */}
          <button
            type="button"
            className={`booster-item-btn${
              !canUndo || undosLeft === 0 || locked ? ' booster-item-btn--disabled' : ''
            }`}
            onClick={onUseUndo}
            disabled={!canUndo || undosLeft === 0 || locked}
            aria-disabled={!canUndo || undosLeft === 0 || locked}
            title={
              undosLeft === 0
                ? 'No undos remaining'
                : !canUndo
                  ? 'No previous move to undo'
                  : 'Revert last placed block'
            }
          >
            <span className="booster-icon" aria-hidden="true">↩️</span>
            <div className="booster-text">
              <div className="booster-name-row">
                <strong>Undo Move</strong>
                <span className="booster-qty">{undosLeft} left</span>
              </div>
              <span className="booster-desc">
                {undosLeft === 0
                  ? 'Exhausted'
                  : !canUndo
                    ? 'Make a move first'
                    : 'Step back 1 placement'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Daily Challenge Widget */}
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
    </aside>
  )
}
