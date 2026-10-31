import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BarChart3, ChevronRight, Menu, Medal, Music, Palette, Settings, Target, Trophy, Volume2, VolumeX, X } from 'lucide-react'
import type { UserProfile } from '../services/gameSessionsApi'
import type { PlayerLevelInfo } from '../game/achievements'
import './appHeader.css'

export type ThemeMode = 'classic' | 'neon' | 'candy' | 'ocean' | 'galaxy'

function MusicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  )
}

export function IconToggleButton({ kind, enabled, onClick }: { kind: 'sound' | 'music'; enabled: boolean; onClick: () => void }) {
  const label = `${kind === 'sound' ? 'Sound' : 'Music'} ${enabled ? 'on' : 'off'}`
  return (
    <button className={`bb-header__toggle bb-header__toggle--${kind}${enabled ? ' is-on' : ' is-off'}`} type="button" onClick={onClick} aria-label={label} aria-pressed={enabled} title={label}>
      {kind === 'sound' ? (
        enabled ? <Volume2 size={20} strokeWidth={1.75} aria-hidden="true" /> : <VolumeX size={20} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        enabled ? <Music size={20} strokeWidth={1.75} aria-hidden="true" /> : <MusicOffIcon />
      )}
    </button>
  )
}

type AppHeaderProps = {
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

export function AppHeader({
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
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [audioOpen, setAudioOpen] = useState(false)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const settingsTouchStartRef = useRef<number | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen && !settingsOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setSettingsOpen(false)
        settingsButtonRef.current?.focus()
      }
      if (event.key === 'Tab' && settingsOpen && settingsPanelRef.current) {
        const focusable = settingsPanelRef.current.querySelectorAll<HTMLElement>('button, input, select')
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen, settingsOpen])

  useEffect(() => {
    if (!themeOpen && !audioOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return
      const target = event.target as Element
      if (!target.closest('.bb-theme-popover, .bb-header__theme-button, .bb-settings-theme-row')) setThemeOpen(false)
      if (!target.closest('.bb-audio-popover, .bb-header__audio-button')) setAudioOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setThemeOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [themeOpen, audioOpen])

  const closeMenu = () => setMenuOpen(false)
  const closeSettings = () => {
    setSettingsOpen(false)
    settingsButtonRef.current?.focus()
  }
  const action = (callback?: () => void) => {
    closeMenu()
    setThemeOpen(false)
    setAudioOpen(false)
    callback?.()
  }
  const themes: Array<{ value: ThemeMode; label: string; color: string }> = [
    { value: 'classic', label: 'Arcade Emerald', color: '#19d58b' },
    { value: 'neon', label: 'Cyber Neon', color: '#7c8cff' },
    { value: 'candy', label: 'Sweet Candy', color: '#ff91c0' },
    { value: 'ocean', label: 'Abyss Ocean', color: '#54b5eb' },
    { value: 'galaxy', label: 'Cosmic Galaxy', color: '#c0a3ff' },
  ]
  const navItems = [
    { label: 'Ranks', icon: Trophy, callback: onOpenLeaderboard, path: '/leaderboard' },
    { label: 'Stats', icon: BarChart3, callback: onOpenDashboard, path: '/dashboard' },
    { label: 'Mission', icon: Target, callback: onOpenChallenge, path: '/challenges' },
    { label: 'Badges', icon: Medal, callback: onOpenAchievements, path: '/achievements' },
  ]
  const currentTheme = themes.find((item) => item.value === theme) ?? themes[0]
  const selectTheme = (value: ThemeMode) => {
    onThemeChange(value)
    setThemeOpen(false)
  }

  const header = (
    <>
      <header className={`bb-header${scrolled ? ' bb-header--scrolled' : ''}`} role="banner">
        <a className="bb-header__brand" href="/" onClick={() => action(onHome)} aria-label="Block Blitz home">
          <img src="/favicon.svg" alt="" />
          <span><strong>BLOCK</strong> <b>BLITZ</b></span>
        </a>
        <nav className="bb-header__nav" aria-label="Game navigation">
          {navItems.map(({ label, icon: Icon, callback, path }) => (
            <button className={window.location.pathname === path ? 'is-active' : ''} type="button" key={label} onClick={() => action(callback)}><Icon size={18} strokeWidth={1.75} aria-hidden="true" /><span>{label}</span></button>
          ))}
        </nav>
        <div className="bb-header__actions">
          {levelInfo && (
            <div className="bb-header__level" title={`${levelInfo.currentXP} / ${levelInfo.nextLevelXP} XP`} aria-label={`Level ${levelInfo.level}, ${levelInfo.currentXP} of ${levelInfo.nextLevelXP} XP`}>
              <svg className="bb-header__xp-ring" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="bb-header__xp-track" cx="12" cy="12" r="9" />
                <circle className="bb-header__xp-progress" cx="12" cy="12" r="9" pathLength="100" style={{ strokeDasharray: `${levelInfo.progressPercent} 100` }} />
              </svg>
              <span className="bb-header__level-label">LV.{levelInfo.level}</span>
              <span className="bb-header__level-number">{levelInfo.level}</span>
            </div>
          )}
          <button className="bb-header__theme-button" type="button" onClick={() => setThemeOpen((open) => !open)} aria-label="Theme" aria-expanded={themeOpen} title={currentTheme.label}><Palette size={18} strokeWidth={1.75} aria-hidden="true" /></button>
          <button ref={settingsButtonRef} className="bb-header__settings" type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" aria-haspopup="dialog" aria-expanded={settingsOpen} title="Settings"><Settings size={20} strokeWidth={1.75} aria-hidden="true" /></button>
          <button className={`bb-header__audio-button${soundEnabled || musicEnabled ? ' is-on' : ''}`} type="button" onClick={() => setAudioOpen((open) => !open)} aria-label="Audio settings" aria-haspopup="dialog" aria-expanded={audioOpen} title="Audio settings">{soundEnabled || musicEnabled ? <Volume2 size={20} strokeWidth={1.75} aria-hidden="true" /> : <VolumeX size={20} strokeWidth={1.75} aria-hidden="true" />}</button>
          <span className="bb-header__divider" aria-hidden="true" />
          <button className="bb-header__profile" type="button" onClick={currentUser ? onOpenDashboard : onOpenAuth} aria-label={currentUser ? `Open ${currentUser.name} profile` : 'Sign in'}>
            <span>{currentUser ? currentUser.name.charAt(0).toUpperCase() : '?'}</span>
            <b>{currentUser ? currentUser.name : 'Sign In'}</b>
          </button>
          <button className="bb-header__menu" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}</button>
        </div>
      </header>
      {menuOpen && (
        <div className="bb-header__drawer" role="dialog" aria-label="Navigation menu">
          {navItems.map(({ label, icon: Icon, callback }) => <button type="button" key={label} onClick={() => action(callback)}><Icon size={18} strokeWidth={1.75} aria-hidden="true" /><span>{label}</span></button>)}
          <IconToggleButton kind="music" enabled={musicEnabled} onClick={onToggleMusic} />
          <IconToggleButton kind="sound" enabled={soundEnabled} onClick={onToggleSound} />
          <button type="button" onClick={() => setThemeOpen((open) => !open)}><Palette size={18} strokeWidth={1.75} aria-hidden="true" /><span>Theme</span></button>
        </div>
      )}
      {themeOpen && (
        <div className="bb-theme-popover" role="dialog" aria-label="Theme choices">
          {themes.map((item) => <button type="button" key={item.value} onClick={() => selectTheme(item.value)}><i style={{ backgroundColor: item.color }} aria-hidden="true" /><span>{item.label}</span>{theme === item.value && <span aria-label="Selected">✓</span>}</button>)}
        </div>
      )}
      {audioOpen && (
        <div className="bb-audio-popover" role="dialog" aria-label="Audio settings">
          <div><span>Sound effects</span><button className={`bb-switch${soundEnabled ? ' is-on' : ''}`} type="button" role="switch" aria-checked={soundEnabled} aria-label="Sound effects" onClick={onToggleSound}><i /></button></div>
          <div><span>Music</span><button className={`bb-switch${musicEnabled ? ' is-on' : ''}`} type="button" role="switch" aria-checked={musicEnabled} aria-label="Music" onClick={onToggleMusic}><i /></button></div>
        </div>
      )}
      {settingsOpen && (
        <div className="bb-settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSettings() }}>
          <section className="bb-settings-panel" ref={settingsPanelRef} role="dialog" aria-modal="true" aria-labelledby="bb-settings-title" onTouchStart={(event) => { settingsTouchStartRef.current = event.touches[0]?.clientY ?? null }} onTouchEnd={(event) => {
            const start = settingsTouchStartRef.current
            settingsTouchStartRef.current = null
            if (start !== null && event.changedTouches[0] && event.changedTouches[0].clientY - start > 60) closeSettings()
          }} onBlur={(event) => {
            if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) closeSettings()
          }}>
            <div className="bb-settings-handle" aria-hidden="true" />
            <header className="bb-settings-header"><h2 id="bb-settings-title">Settings</h2><button type="button" onClick={closeSettings} aria-label="Close settings"><X size={20} /></button></header>
            <div className="bb-settings-row"><span><Volume2 size={18} aria-hidden="true" />Sound effects</span><button className={`bb-switch${soundEnabled ? ' is-on' : ''}`} type="button" role="switch" aria-checked={soundEnabled} aria-label="Sound effects" onClick={onToggleSound}><i /></button></div>
            <div className="bb-settings-row"><span><Music size={18} aria-hidden="true" />Music</span><button className={`bb-switch${musicEnabled ? ' is-on' : ''}`} type="button" role="switch" aria-checked={musicEnabled} aria-label="Music" onClick={onToggleMusic}><i /></button></div>
            <button className="bb-settings-row bb-settings-theme-row" type="button" onClick={() => setThemeOpen((open) => !open)}><span><Palette size={18} aria-hidden="true" />Theme</span><span>{currentTheme.label}<ChevronRight size={18} aria-hidden="true" /></span></button>
          </section>
        </div>
      )}
    </>
  )

  return createPortal(header, document.body)
}
