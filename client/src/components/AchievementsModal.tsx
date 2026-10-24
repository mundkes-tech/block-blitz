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
  if (!isOpen) return null

  const unlockedSet = new Set(unlockedIds)
  const totalCount = ACHIEVEMENTS.length
  const unlockedCount = unlockedSet.size
  const percent = Math.round((unlockedCount / totalCount) * 100)

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="achievements-title">
      <div className="modal-card achievements-card">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">CAREER MILESTONES</span>
            <h2 id="achievements-title">🏆 ACHIEVEMENTS & BADGES</h2>
          </div>
          <button className="icon-close-btn" type="button" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        {/* Progress summary banner */}
        <div className="achievements-progress-banner">
          <div className="achievements-progress-text">
            <span>Unlocked Progress</span>
            <strong>{unlockedCount} of {totalCount} Badges ({percent}%)</strong>
          </div>
          <div className="sidebar-progress-track">
            <div className="sidebar-progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>

        {/* Achievements list */}
        <div className="achievements-grid">
          {ACHIEVEMENTS.map((ach: Achievement) => {
            const isUnlocked = unlockedSet.has(ach.id)
            return (
              <div
                key={ach.id}
                className={`achievement-card${isUnlocked ? ' achievement-card--unlocked' : ' achievement-card--locked'}`}
              >
                <div className="achievement-icon-wrapper">
                  <span className="achievement-icon">{ach.icon}</span>
                </div>
                <div className="achievement-info">
                  <div className="achievement-title-row">
                    <h4>{ach.title}</h4>
                    <span className="achievement-xp-tag">+{ach.xpReward} XP</span>
                  </div>
                  <p>{ach.description}</p>
                </div>
                <div className="achievement-status">
                  {isUnlocked ? (
                    <span className="badge-unlocked">✓ UNLOCKED</span>
                  ) : (
                    <span className="badge-locked">LOCKED</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <footer className="modal-footer">
          <button className="primary-button" type="button" onClick={onClose}>
            Close Badges
          </button>
        </footer>
      </div>
    </div>
  )
}
