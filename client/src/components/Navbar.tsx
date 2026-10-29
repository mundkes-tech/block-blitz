import { useState, useEffect } from 'react'
import type { UserProfile } from '../services/gameSessionsApi'
import type { PlayerLevelInfo } from '../game/achievements'

export type ThemeMode = 'classic' | 'neon' | 'candy' | 'ocean' | 'galaxy'

type NavbarProps = {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  soundEnabled: boolean
  onToggleSound: () => void
  musicEnabled: boolean
  onToggleMusic: () => void
  onOpenLeaderboard: () => void
  onOpenDashboard: () => void
  onOpenChallenge: () => void
  onOpenAchievements: () => void
  onHome?: () => void
  onOpenAuth?: () => void
  levelInfo?: PlayerLevelInfo
  currentUser?: UserProfile | null
}

export function Navbar({
  theme,
  onThemeChange,
  soundEnabled,
  onToggleSound,
  musicEnabled,
  onToggleMusic,
  onOpenLeaderboard,
  onOpenDashboard,
  onOpenChallenge,
  onOpenAchievements,
  onHome,
  onOpenAuth,
  levelInfo,
  currentUser,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen])

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const handleAction = (callback?: () => void) => {
    setIsMobileMenuOpen(false)
    callback?.()
  }

  return (
    <>
      <header className="top-navbar" role="banner">
        {/* Brand Logo & Name */}
        <a
          href="/"
          className="navbar-left"
          onClick={() => handleAction(onHome)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleAction(onHome)
            }
          }}
          role="button"
          tabIndex={0}
          title="Return to Home screen"
          aria-label="BLOCK BLITZ Home"
        >
          <img className="navbar-logo-icon" src="/favicon.svg" alt="" />
          <div className="navbar-branding" aria-label="Block Blitz">
            <span className="navbar-title"><span className="navbar-title-block">BLOCK</span> <span className="navbar-title-blitz">BLITZ</span></span>
          </div>
        </a>

        {/* Center Desktop Navigation */}
        <nav className="navbar-center" aria-label="Game navigation">
          <button
            className="nav-action-btn"
            type="button"
            onClick={onOpenLeaderboard}
            title="Global Rankings & Leaderboard"
          >
            <span className="nav-btn-icon" aria-hidden="true">🏆</span>
            <span className="nav-btn-text">Leaderboard</span>
          </button>
          <button
            className="nav-action-btn"
            type="button"
            onClick={onOpenDashboard}
            title="Career Stats & Match History"
          >
            <span className="nav-btn-icon" aria-hidden="true">📊</span>
            <span className="nav-btn-text">Stats</span>
          </button>
          <button
            className="nav-action-btn"
            type="button"
            onClick={onOpenChallenge}
            title="Daily Mission"
          >
            <span className="nav-btn-icon" aria-hidden="true">🎯</span>
            <span className="nav-btn-text">Mission</span>
          </button>
          <button
            className="nav-action-btn"
            type="button"
            onClick={onOpenAchievements}
            title="Career Milestones & Badges"
          >
            <span className="nav-btn-icon" aria-hidden="true">🎖️</span>
            <span className="nav-btn-text">Badges</span>
          </button>
        </nav>

        {/* Right Toolbar & Controls */}
        <div className="navbar-right">
          {/* Level & XP Mini Badge (Desktop & Tablet) */}
          {levelInfo && (
            <div
              className="navbar-level-badge"
              title={`Player Tier: ${levelInfo.title} (${levelInfo.currentXP} XP)`}
              aria-label={`Player Level ${levelInfo.level}, ${levelInfo.title}`}
            >
              <span className="level-number tabular-nums">Lv.{levelInfo.level}</span>
              <div
                className="level-mini-bar"
                role="progressbar"
                aria-valuenow={levelInfo.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Level progression"
              >
                <div
                  className="level-mini-fill"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Theme Selector Dropdown */}
          <div className="theme-select-wrapper">
            <label htmlFor="theme-select" className="sr-only">Visual Theme</label>
            <select
              id="theme-select"
              className="theme-dropdown"
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
              aria-label="Select visual theme"
            >
              <option value="classic">Arcade Emerald</option>
              <option value="neon">Cyber Neon</option>
              <option value="candy">Sweet Candy</option>
              <option value="ocean">Abyss Ocean</option>
              <option value="galaxy">Cosmic Galaxy</option>
            </select>
          </div>

          {/* Dedicated Audio Icon Buttons (Zero text truncation) */}
          <div className="navbar-audio-group" role="group" aria-label="Audio controls">
            <button
              type="button"
              role="switch"
              aria-checked={musicEnabled}
              aria-label={`Background Music: ${musicEnabled ? 'On' : 'Off'}`}
              className={`audio-btn audio-btn--music${musicEnabled ? ' audio-btn--active' : ''}`}
              onClick={onToggleMusic}
              title={musicEnabled ? 'Mute Background Music (🎵 On)' : 'Play Background Music (🔇 Off)'}
            >
              <span className="audio-icon" aria-hidden="true">
                {musicEnabled ? '🎵' : '🔇'}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              aria-label={`Sound Effects: ${soundEnabled ? 'On' : 'Off'}`}
              className={`audio-btn audio-btn--sfx${soundEnabled ? ' audio-btn--active' : ''}`}
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute Sound Effects (🔊 On)' : 'Unmute Sound Effects (🔈 Off)'}
            >
              <span className="audio-icon" aria-hidden="true">
                {soundEnabled ? '🔊' : '🔈'}
              </span>
            </button>
          </div>

          {/* User Profile / Auth Pill */}
          {currentUser ? (
            <button
              className="user-profile-pill"
              type="button"
              onClick={onOpenDashboard}
              title={`Logged in as ${currentUser.name} (${currentUser.email})`}
              aria-label={`User profile: ${currentUser.name}`}
            >
              <span className="avatar-dot" aria-hidden="true">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
              </span>
              <span className="user-pill-name">{currentUser.name}</span>
            </button>
          ) : (
            <button
              className="user-profile-pill user-profile-pill--guest"
              type="button"
              onClick={onOpenAuth}
              title="Playing as Guest. Click to sign in or register."
              aria-label="Guest player. Sign in or register."
            >
              <span className="avatar-dot avatar-dot--guest" aria-hidden="true">👤</span>
              <span className="user-pill-name">Sign In</span>
            </button>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className={`navbar-hamburger-btn${isMobileMenuOpen ? ' navbar-hamburger-btn--open' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            title={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          >
            <span className="hamburger-icon" aria-hidden="true">
              {isMobileMenuOpen ? '✕' : '☰'}
            </span>
          </button>
        </div>
      </header>

      {/* Spacer to push page content cleanly below fixed top-navbar */}
      <div className="navbar-spacer" aria-hidden="true" />

      {/* Mobile Navigation Drawer & Scrim Overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          role="presentation"
        >
          <div
            className="mobile-nav-drawer animate-slide-down"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Drawer"
          >
            {/* Drawer Header with Player Card */}
            <div className="mobile-drawer-header">
              <div className="mobile-player-card">
                <div className="mobile-player-avatar" aria-hidden="true">
                  {currentUser ? (currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P') : '👤'}
                </div>
                <div className="mobile-player-info">
                  <strong className="mobile-player-name">
                    {currentUser ? currentUser.name : 'Guest Blitzer'}
                  </strong>
                  <span className="mobile-player-status">
                    {currentUser ? currentUser.email : 'Scores stored locally'}
                  </span>
                </div>
                {currentUser ? (
                  <button
                    type="button"
                    className="mobile-auth-btn mobile-auth-btn--view"
                    onClick={() => handleAction(onOpenDashboard)}
                  >
                    View Stats
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mobile-auth-btn mobile-auth-btn--signin"
                    onClick={() => handleAction(onOpenAuth)}
                  >
                    Sign In
                  </button>
                )}
              </div>

              {/* Mobile Level & XP Progress Track */}
              {levelInfo && (
                <div className="mobile-level-row">
                  <div className="mobile-level-labels">
                    <span className="mobile-level-title">Tier: {levelInfo.title}</span>
                    <strong className="mobile-level-val tabular-nums">Lv.{levelInfo.level} ({levelInfo.currentXP} XP)</strong>
                  </div>
                  <div
                    className="mobile-level-track"
                    role="progressbar"
                    aria-valuenow={levelInfo.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Level progression"
                  >
                    <div
                      className="mobile-level-fill"
                      style={{ width: `${levelInfo.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Body: Hub Links & Audio/Theme Settings */}
            <div className="mobile-drawer-body">
              {/* Mobile Navigation Hub Cards */}
              <div className="mobile-nav-links" role="group" aria-label="Game links">
                <button
                  type="button"
                  className="mobile-nav-card"
                  onClick={() => handleAction(onOpenLeaderboard)}
                >
                  <span className="mobile-nav-icon" aria-hidden="true">🏆</span>
                  <div className="mobile-nav-card-text">
                    <strong>Leaderboard</strong>
                    <span>Global high scores</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="mobile-nav-card"
                  onClick={() => handleAction(onOpenDashboard)}
                >
                  <span className="mobile-nav-icon" aria-hidden="true">📊</span>
                  <div className="mobile-nav-card-text">
                    <strong>Career Stats</strong>
                    <span>Matches & history</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="mobile-nav-card"
                  onClick={() => handleAction(onOpenChallenge)}
                >
                  <span className="mobile-nav-icon" aria-hidden="true">🎯</span>
                  <div className="mobile-nav-card-text">
                    <strong>Daily Mission</strong>
                    <span>10 lines challenge</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="mobile-nav-card"
                  onClick={() => handleAction(onOpenAchievements)}
                >
                  <span className="mobile-nav-icon" aria-hidden="true">🎖️</span>
                  <div className="mobile-nav-card-text">
                    <strong>Badges</strong>
                    <span>Milestones unlocked</span>
                  </div>
                </button>
              </div>

              {/* Mobile Settings Strip: Theme & Audio Switches */}
              <div className="mobile-settings-section">
                <span className="mobile-section-heading">AUDIO & THEME</span>

                <div className="mobile-settings-row">
                  <span className="mobile-settings-label">Visual Theme</span>
                  <select
                    className="mobile-theme-select"
                    value={theme}
                    onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
                    aria-label="Select visual theme"
                  >
                    <option value="classic">🟢 Arcade Emerald</option>
                    <option value="neon">⚡ Cyber Neon</option>
                    <option value="candy">🍬 Sweet Candy</option>
                    <option value="ocean">🌊 Abyss Ocean</option>
                    <option value="galaxy">🌌 Cosmic Galaxy</option>
                  </select>
                </div>

                <div className="mobile-settings-row">
                  <span className="mobile-settings-label">
                    <span className="audio-icon-inline" aria-hidden="true">🎵</span> Background Music
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={musicEnabled}
                    onClick={onToggleMusic}
                    className={`mobile-switch${musicEnabled ? ' mobile-switch--active' : ''}`}
                    aria-label="Toggle background music"
                  >
                    <span className="mobile-switch-thumb" />
                    <span className="sr-only">{musicEnabled ? 'On' : 'Off'}</span>
                  </button>
                </div>

                <div className="mobile-settings-row">
                  <span className="mobile-settings-label">
                    <span className="audio-icon-inline" aria-hidden="true">🔊</span> Sound Effects (SFX)
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundEnabled}
                    onClick={onToggleSound}
                    className={`mobile-switch${soundEnabled ? ' mobile-switch--active' : ''}`}
                    aria-label="Toggle sound effects"
                  >
                    <span className="mobile-switch-thumb" />
                    <span className="sr-only">{soundEnabled ? 'On' : 'Off'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Drawer Pinned Footer */}
            <footer className="mobile-drawer-footer">
              <button
                type="button"
                className="mobile-drawer-close-btn"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ✕ Close Menu
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
