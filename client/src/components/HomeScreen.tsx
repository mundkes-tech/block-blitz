import { useState } from 'react'
import type { UserProfile } from '../services/gameSessionsApi'
import type { PlayerLevelInfo } from '../game/achievements'

type GameMode = 'classic' | 'blitz' | 'bomb'

type HomeScreenProps = {
  bestScore: number
  hasActiveGame?: boolean
  totalLinesCleared?: number
  unlockedBadgesCount?: number
  onPlay: (mode?: GameMode) => void
  onNewGame?: () => void
  currentUser?: UserProfile | null
  levelInfo?: PlayerLevelInfo
  onOpenLeaderboard: () => void
  onOpenDashboard: () => void
  onOpenChallenge: () => void
  onOpenAchievements: () => void
}

export function HomeScreen({
  bestScore,
  hasActiveGame = false,
  totalLinesCleared = 0,
  unlockedBadgesCount = 0,
  onPlay,
  onNewGame,
  currentUser,
  levelInfo,
  onOpenLeaderboard,
  onOpenDashboard,
  onOpenChallenge,
  onOpenAchievements,
}: HomeScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic')

  const dailyTargetLines = 10
  const dailyLinesProgress = Math.min(100, Math.round((totalLinesCleared / dailyTargetLines) * 100))
  const isDailyCompleted = totalLinesCleared >= dailyTargetLines

  const totalBadges = 8
  const badgesProgress = Math.min(100, Math.round((unlockedBadgesCount / totalBadges) * 100))

  return (
    <main className="home-screen-portal" role="main">
      {/* Dynamic Ambient Auras (Decorative) */}
      <div className="portal-ambient-auras" aria-hidden="true">
        <div className="aura-blob aura-blob--emerald" />
        <div className="aura-blob aura-blob--cyan" />
        <div className="aura-blob aura-blob--purple" />
      </div>

      <div className="portal-content-container">
        {/* Top Hero Brand Header */}
        <header className="portal-hero-header">
          <div className="portal-brand-pill">
            <span className="brand-gem-spin" aria-hidden="true">💎</span>
            <span className="brand-pill-text">ARCADE BLOCK PUZZLE</span>
            <span className="brand-pill-badge">OFFICIAL</span>
          </div>

          <h1 className="portal-brand-title">
            <span className="title-word title-block">BLOCK</span>
            <span className="title-word title-blitz">BLITZ</span>
          </h1>

          <p className="portal-tagline">
            PUZZLE <span className="dot">•</span> PLACE <span className="dot">•</span> CLEAR <span className="dot">•</span> COMBO
          </p>

          <p className="portal-lead-text">
            Fit geometric arcade blocks onto the 8×8 grid, chain explosive line clears, and conquer the global leaderboards!
          </p>
        </header>

        {/* Best Score & Career Status Banner */}
        <section className="portal-stats-hero" aria-label="Player high score">
          <div className="portal-stat-card">
            <span className="portal-stat-label">PERSONAL BEST</span>
            <strong className="portal-stat-value tabular-nums font-mono">
              {bestScore.toLocaleString()}
            </strong>
            <span className="portal-stat-sub">
              {currentUser ? `Ranked as ${currentUser.name}` : 'Saved locally · Sign in to rank'}
            </span>
          </div>

          {levelInfo && (
            <div className="portal-stat-card">
              <span className="portal-stat-label">PLAYER TIER</span>
              <strong className="portal-stat-value portal-stat-tier">
                Lv.{levelInfo.level} {levelInfo.title}
              </strong>
              <div
                className="portal-level-track"
                role="progressbar"
                aria-valuenow={levelInfo.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Level progress"
              >
                <div
                  className="portal-level-fill"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Game Mode Selection */}
        <section className="portal-modes-section" aria-label="Select Game Mode">
          <div className="portal-modes-header">
            <span className="eyebrow">SELECT GAME MODE</span>
          </div>

          <div className="portal-modes-grid" role="radiogroup" aria-label="Game Modes">
            <button
              type="button"
              role="radio"
              aria-checked={selectedMode === 'classic'}
              className={`mode-card${selectedMode === 'classic' ? ' mode-card--selected' : ''}`}
              onClick={() => setSelectedMode('classic')}
            >
              <div className="mode-card-badge">STANDARD</div>
              <span className="mode-icon" aria-hidden="true">🟢</span>
              <h3>Classic Blitz</h3>
              <p>Timeless block puzzle experience. Endless placement until no moves remain.</p>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selectedMode === 'blitz'}
              className={`mode-card${selectedMode === 'blitz' ? ' mode-card--selected' : ''}`}
              onClick={() => setSelectedMode('blitz')}
            >
              <div className="mode-card-badge">TIMED</div>
              <span className="mode-icon" aria-hidden="true">⚡</span>
              <h3>Blitz Rush</h3>
              <p>Fast-paced arcade session. Clear rows rapidly to maximize combo bonus points.</p>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selectedMode === 'bomb'}
              className={`mode-card${selectedMode === 'bomb' ? ' mode-card--selected' : ''}`}
              onClick={() => setSelectedMode('bomb')}
            >
              <div className="mode-card-badge">TACTICAL</div>
              <span className="mode-icon" aria-hidden="true">💣</span>
              <h3>Bomb Defense</h3>
              <p>Defuse ticking explosive obstacles before their countdown reaches zero.</p>
            </button>
          </div>
        </section>

        {/* Action Button Strip */}
        <section className="portal-play-strip" aria-label="Launch game">
          {hasActiveGame ? (
            <div className="portal-active-game-actions">
              <button
                type="button"
                className="portal-play-btn portal-play-btn--continue animate-pulse-glow"
                onClick={() => onPlay(selectedMode)}
              >
                ▶ CONTINUE MATCH
              </button>
              {onNewGame && (
                <button
                  type="button"
                  className="portal-secondary-play-btn"
                  onClick={onNewGame}
                >
                  Restart New Match
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="portal-play-btn animate-pulse-glow"
              onClick={() => onPlay(selectedMode)}
            >
              ▶ PLAY NOW
            </button>
          )}
        </section>

        {/* Secondary Hub Cards: Mission, Badges, Arena */}
        <section className="portal-hub-grid" aria-label="Game features">
          <button
            type="button"
            className="hub-card"
            onClick={onOpenChallenge}
          >
            <div className="hub-card-top">
              <span className="hub-icon" aria-hidden="true">{isDailyCompleted ? '🏆' : '🎯'}</span>
              <span className="hub-eyebrow">DAILY MISSION</span>
            </div>
            <h4>Clear 10 Lines</h4>
            <div className="hub-progress-track">
              <div className="hub-progress-fill" style={{ width: `${dailyLinesProgress}%` }} />
            </div>
            <span className="hub-footer-text">
              {isDailyCompleted ? '✓ Completed today!' : `${10 - totalLinesCleared} more lines needed`}
            </span>
          </button>

          <button
            type="button"
            className="hub-card"
            onClick={onOpenAchievements}
          >
            <div className="hub-card-top">
              <span className="hub-icon" aria-hidden="true">🎖️</span>
              <span className="hub-eyebrow">MILESTONES</span>
            </div>
            <h4>Achievements</h4>
            <div className="hub-progress-track">
              <div className="hub-progress-fill" style={{ width: `${badgesProgress}%` }} />
            </div>
            <span className="hub-footer-text">
              {unlockedBadgesCount} / {totalBadges} Badges Unlocked
            </span>
          </button>

          <button
            type="button"
            className="hub-card"
            onClick={onOpenLeaderboard}
          >
            <div className="hub-card-top">
              <span className="hub-icon" aria-hidden="true">🏆</span>
              <span className="hub-eyebrow">GLOBAL RANKS</span>
            </div>
            <h4>Leaderboard</h4>
            <p className="hub-desc">View all-time and daily top scores</p>
            <span className="hub-footer-text">Check Standings →</span>
          </button>

          <button
            type="button"
            className="hub-card"
            onClick={onOpenDashboard}
          >
            <div className="hub-card-top">
              <span className="hub-icon" aria-hidden="true">📊</span>
              <span className="hub-eyebrow">PROFILE & STATS</span>
            </div>
            <h4>Dashboard</h4>
            <p className="hub-desc">Career match log, lines, and averages</p>
            <span className="hub-footer-text">View History →</span>
          </button>
        </section>
      </div>
    </main>
  )
}
