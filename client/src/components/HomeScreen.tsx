import { useState, useRef, type PointerEvent } from 'react'
import type { UserProfile } from '../services/gameSessionsApi'
import type { PlayerLevelInfo } from '../game/achievements'

type GameMode = 'classic' | 'blitz' | 'bomb'

type HomeScreenProps = {
  bestScore: number
  onPlay: (mode?: GameMode) => void
  currentUser?: UserProfile | null
  levelInfo?: PlayerLevelInfo
  onOpenLeaderboard: () => void
  onOpenDashboard: () => void
  onOpenChallenge: () => void
  onOpenAchievements: () => void
}

export function HomeScreen({
  bestScore,
  onPlay,
  currentUser,
  levelInfo,
  onOpenLeaderboard,
  onOpenDashboard,
  onOpenChallenge,
  onOpenAchievements,
}: HomeScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const showcaseRef = useRef<HTMLDivElement>(null)

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!showcaseRef.current) return
    const rect = showcaseRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: x * 10, y: -y * 10 })
  }

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  const handleStartGame = () => {
    onPlay(selectedMode)
  }

  return (
    <main className="home-screen-portal">
      {/* Dynamic Animated Ambient Neon Auras */}
      <div className="portal-ambient-auras" aria-hidden="true">
        <div className="aura-blob aura-blob--emerald" />
        <div className="aura-blob aura-blob--cyan" />
        <div className="aura-blob aura-blob--purple" />
      </div>

      {/* Floating 3D Arcade Shapes Accent Field */}
      <div className="portal-floating-shapes" aria-hidden="true">
        <div className="float-shape float-shape--1" />
        <div className="float-shape float-shape--2" />
        <div className="float-shape float-shape--3" />
        <div className="float-shape float-shape--4" />
        <div className="float-shape float-shape--5" />
      </div>

      <div className="portal-content-container">
        {/* Top Hero Brand Header */}
        <header className="portal-hero-header">
          <div className="portal-brand-pill">
            <span className="brand-gem-spin">💎</span>
            <span className="brand-pill-text">VELOOP ARCADE GAMING PORTAL</span>
            <span className="brand-pill-badge">v2.0 PRO</span>
          </div>

          <h1 className="portal-brand-title">
            <span className="title-word title-block">BLOCK</span>
            <span className="title-word title-blitz">BLITZ</span>
          </h1>

          <p className="portal-tagline">
            PUZZLE <span className="dot">•</span> PLACE <span className="dot">•</span> CLEAR <span className="dot">•</span> COMBO
          </p>

          <p className="portal-lead-text">
            Fit geometric neon blocks onto the 8×8 grid, chain explosive combo clears, and unlock real VeLoop reward perks!
          </p>
        </header>

        {/* Main Two-Column Interactive Gaming Lobby */}
        <div className="portal-main-grid">
          {/* Left Column: Game Modes & Giant 3D Play Button */}
          <section className="portal-action-column" aria-label="Game Mode and Launch">
            {/* Player Status Ribbon */}
            <div className="portal-player-ribbon">
              <div className="ribbon-avatar" onClick={onOpenDashboard} role="button" tabIndex={0} title="Open Player Dashboard">
                <span>{currentUser ? currentUser.name.charAt(0).toUpperCase() : '⚡'}</span>
              </div>
              <div className="ribbon-info">
                <div className="ribbon-name-row">
                  <span className="ribbon-player-name">{currentUser?.name ?? 'Guest Blitz Player'}</span>
                  {levelInfo && (
                    <span className="ribbon-tier-tag">
                      Lv.{levelInfo.level} {levelInfo.title}
                    </span>
                  )}
                </div>
                <div className="ribbon-stats-row">
                  <span className="ribbon-stat-item">🏆 Best: <strong>{bestScore.toLocaleString()}</strong> pts</span>
                  <span className="ribbon-stat-divider">•</span>
                  <span className="ribbon-stat-item">🪙 VeLoop: <strong>+50 XP</strong> / game</span>
                </div>
              </div>
            </div>

            {/* Giant 3D Arcade Push Button (Immediate First Fold CTA) */}
            <div className="portal-play-action-wrapper">
              <button
                className="arcade-launch-button"
                type="button"
                onClick={handleStartGame}
                aria-label={`Start game in ${selectedMode} mode`}
              >
                <span className="launch-btn-shadow" />
                <span className="launch-btn-edge" />
                <span className="launch-btn-front">
                  <span className="launch-btn-icon">🎮</span>
                  <span className="launch-btn-label">START GAME</span>
                  <span className="launch-btn-xp-pill">+50 XP</span>
                </span>
              </button>
            </div>

            {/* Mode Selection Cards */}
            <div className="portal-modes-section">
              <div className="section-eyebrow-row">
                <span className="section-eyebrow">SELECT GAME MODE</span>
                <span className="section-eyebrow-hint">Pick your challenge style</span>
              </div>

              <div className="portal-modes-grid" role="radiogroup" aria-label="Select Game Mode">
                {/* Mode 1: Classic Endless */}
                <div
                  className={`mode-card${selectedMode === 'classic' ? ' mode-card--selected' : ''}`}
                  onClick={() => setSelectedMode('classic')}
                  role="radio"
                  aria-checked={selectedMode === 'classic'}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedMode('classic') }}
                >
                  <div className="mode-card-header">
                    <span className="mode-card-icon mode-icon--classic">🟢</span>
                    <span className="mode-card-badge mode-badge--emerald">UNLIMITED</span>
                  </div>
                  <strong className="mode-card-title">Classic Endless</strong>
                  <p className="mode-card-desc">Pure strategic puzzle flow. No timer, fair piece generation, and limitless combos.</p>
                  <div className="mode-card-footer">
                    <span className="mode-card-stat">⭐ Best: {bestScore.toLocaleString()}</span>
                    <span className="mode-card-check">✓ Active</span>
                  </div>
                </div>

                {/* Mode 2: Timed Blitz */}
                <div
                  className={`mode-card${selectedMode === 'blitz' ? ' mode-card--selected' : ''}`}
                  onClick={() => setSelectedMode('blitz')}
                  role="radio"
                  aria-checked={selectedMode === 'blitz'}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedMode('blitz') }}
                >
                  <div className="mode-card-header">
                    <span className="mode-card-icon mode-icon--blitz">⚡</span>
                    <span className="mode-card-badge mode-badge--amber">60S RUSH</span>
                  </div>
                  <strong className="mode-card-title">Blitz Rush</strong>
                  <p className="mode-card-desc">Race the 60-second countdown! Chain rapid clears for 2× multiplier XP frenzy.</p>
                  <div className="mode-card-footer">
                    <span className="mode-card-stat">🔥 High Speed</span>
                    <span className="mode-card-check">✓ Active</span>
                  </div>
                </div>

                {/* Mode 3: Bomb Buster */}
                <div
                  className={`mode-card${selectedMode === 'bomb' ? ' mode-card--selected' : ''}`}
                  onClick={() => setSelectedMode('bomb')}
                  role="radio"
                  aria-checked={selectedMode === 'bomb'}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedMode('bomb') }}
                >
                  <div className="mode-card-header">
                    <span className="mode-card-icon mode-icon--bomb">💣</span>
                    <span className="mode-card-badge mode-badge--rose">HAZARD</span>
                  </div>
                  <strong className="mode-card-title">Bomb Buster</strong>
                  <p className="mode-card-desc">Tactical challenge! Defuse ticking hazard blocks by clearing lines before zero.</p>
                  <div className="mode-card-footer">
                    <span className="mode-card-stat">💥 Bonus Loot</span>
                    <span className="mode-card-check">✓ Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Power-ups Info Strip */}
            <div className="portal-boosters-preview">
              <span className="boosters-preview-label">IN-GAME POWER-UPS:</span>
              <div className="boosters-preview-items">
                <span className="booster-pill" title="Reroll 3 fresh pieces"><span className="booster-emoji">🔄</span> Reroll (1)</span>
                <span className="booster-pill" title="Smash any occupied block"><span className="booster-emoji">🔨</span> Hammer (1)</span>
                <span className="booster-pill" title="Undo your previous placement"><span className="booster-emoji">↩️</span> Undo (1)</span>
              </div>
            </div>
          </section>

          {/* Right Column: 3D Showcase, Quests Hub & Quick Modals */}
          <section className="portal-hub-column" aria-label="Game Showcase and Quests">
            {/* 3D Isometric Board Showcase */}
            <div
              ref={showcaseRef}
              className="portal-showcase-card"
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
            >
              <div className="showcase-header">
                <span className="showcase-badge">⚡ LIVE ARENA PREVIEW</span>
                <span className="showcase-hint">8×8 Puzzle Grid</span>
              </div>

              <div className="showcase-board-wrapper">
                <div
                  className="showcase-board-grid"
                  style={{
                    transform: `perspective(700px) rotateX(${12 + tilt.y * 0.7}deg) rotateY(${-4 + tilt.x * 0.7}deg)`,
                  }}
                >
                  {Array.from({ length: 64 }, (_, index) => {
                    const filledPositions: Record<number, string> = {
                      1: '#f59e0b',
                      2: '#f59e0b',
                      9: '#f59e0b',
                      10: '#f59e0b',
                      18: '#06b6d4',
                      19: '#06b6d4',
                      26: '#06b6d4',
                      34: '#ec4899',
                      35: '#ec4899',
                      36: '#ec4899',
                      43: '#ec4899',
                      51: '#a855f7',
                      52: '#a855f7',
                      53: '#a855f7',
                    }
                    const color = filledPositions[index]
                    return (
                      <span
                        key={index}
                        className={`showcase-cell ${color ? 'showcase-cell--filled' : ''}`}
                        style={
                          color
                            ? {
                                backgroundColor: color,
                                boxShadow: `0 0 12px ${color}bb, inset 0 2px 2px rgba(255, 255, 255, 0.6), inset 0 -2px 3px rgba(0, 0, 0, 0.4)`,
                              }
                            : undefined
                        }
                      />
                    )
                  })}
                </div>

                {/* Floating Celebratory Chips */}
                <div className="showcase-chips-cluster">
                  <span className="showcase-chip chip-top">Combo 3×! 🔥</span>
                  <span className="showcase-chip chip-left">Line Clear! ⚡</span>
                  <span className="showcase-chip chip-bottom">💎 +250 VeLoop Pts</span>
                </div>
              </div>
            </div>

            {/* Daily Quests Teaser Card */}
            <div className="portal-quests-card">
              <div className="quests-card-header">
                <div className="quests-title-group">
                  <span className="quests-icon">🎯</span>
                  <div>
                    <strong className="quests-heading">DAILY MISSIONS</strong>
                    <span className="quests-subheading">Complete to earn bonus XP</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="quests-action-link"
                  onClick={onOpenChallenge}
                >
                  View All →
                </button>
              </div>

              <div className="quests-list">
                <div className="quest-row" onClick={onOpenChallenge} role="button" tabIndex={0}>
                  <div className="quest-icon-badge">⚡</div>
                  <div className="quest-details">
                    <div className="quest-label-row">
                      <span className="quest-name">Line Clearer</span>
                      <span className="quest-count">3 / 5</span>
                    </div>
                    <div className="quest-progress-track">
                      <div className="quest-progress-bar" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>

                <div className="quest-row" onClick={onOpenChallenge} role="button" tabIndex={0}>
                  <div className="quest-icon-badge">🔥</div>
                  <div className="quest-details">
                    <div className="quest-label-row">
                      <span className="quest-name">Combo Striker</span>
                      <span className="quest-count text-emerald">READY! ⭐</span>
                    </div>
                    <div className="quest-progress-track">
                      <div className="quest-progress-bar quest-progress-bar--complete" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="portal-quick-actions-bar">
              <button
                type="button"
                className="portal-quick-btn"
                onClick={onOpenLeaderboard}
              >
                <span className="quick-btn-icon">🏆</span>
                <span className="quick-btn-label">Leaderboard</span>
              </button>

              <button
                type="button"
                className="portal-quick-btn"
                onClick={onOpenDashboard}
              >
                <span className="quick-btn-icon">📊</span>
                <span className="quick-btn-label">My Stats</span>
              </button>

              <button
                type="button"
                className="portal-quick-btn"
                onClick={onOpenChallenge}
              >
                <span className="quick-btn-icon">🎯</span>
                <span className="quick-btn-label">Missions</span>
              </button>

              <button
                type="button"
                className="portal-quick-btn"
                onClick={onOpenAchievements}
              >
                <span className="quick-btn-icon">🎖️</span>
                <span className="quick-btn-label">Badges</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
