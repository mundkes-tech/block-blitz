import { useEffect } from 'react'
import { ACHIEVEMENTS, type Achievement } from '../game/achievements'

type AchievementsModalProps = {
  isOpen: boolean
  onClose: () => void
  unlockedIds: string[]
}

export function AchievementsModal({
  isOpen,
  onClose,
  unlockedIds,
}: AchievementsModalProps) {
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

  if (!isOpen) return null

  const unlockedSet = new Set(unlockedIds)
  const totalCount = ACHIEVEMENTS.length
  const unlockedCount = unlockedSet.size
  const percent = Math.round((unlockedCount / totalCount) * 100)

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card achievements-card animate-scale-up">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">CAREER MILESTONES</span>
            <h2 id="achievements-title">🎖️ ACHIEVEMENTS & BADGES</h2>
          </div>
          <button
            className="icon-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close achievements dialog"
          >
            ✕
          </button>
        </header>

        {/* Progress summary banner */}
        <div className="achievements-progress-banner">
          <div className="achievements-progress-text">
            <span>Career Milestones Unlocked</span>
            <strong className="tabular-nums font-mono">
              {unlockedCount} of {totalCount} Badges ({percent}%)
            </strong>
          </div>
          <div
            className="sidebar-progress-track"
            role="progressbar"
            aria-valuenow={unlockedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-label="Achievements unlocked"
          >
            <div className="sidebar-progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>

        {/* Achievements list */}
        <div className="achievements-grid" role="list">
          {ACHIEVEMENTS.map((ach: Achievement) => {
            const isUnlocked = unlockedSet.has(ach.id)
            return (
              <div
                key={ach.id}
                className={`achievement-card${
                  isUnlocked ? ' achievement-card--unlocked' : ' achievement-card--locked'
                }`}
                role="listitem"
              >
                <div className="achievement-icon-wrapper" aria-hidden="true">
                  <span className="achievement-icon">{ach.icon}</span>
                </div>
                <div className="achievement-info">
                  <div className="achievement-title-row">
                    <h4>{ach.title}</h4>
                    <span className="achievement-xp-tag tabular-nums font-mono">
                      +{ach.xpReward} XP
                    </span>
                  </div>
                  <p>{ach.description}</p>
                </div>
                <div className="achievement-status">
                  {isUnlocked ? (
                    <span className="badge-unlocked" aria-label="Unlocked">
                      ✓ UNLOCKED
                    </span>
                  ) : (
                    <span className="badge-locked" aria-label="Locked">
                      🔒 LOCKED
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <footer className="modal-footer">
          <button className="primary-button btn-sm" type="button" onClick={onClose}>
            Close Badges
          </button>
        </footer>
      </div>
    </div>
  )
}
