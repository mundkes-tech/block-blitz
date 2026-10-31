export type SoundEffect =
  | 'placement'
  | 'lineClear'
  | 'multiLine'
  | 'combo'
  | 'gameOver'
  | 'newBest'
  | 'buttonClick'
  | 'blockPick'
  | 'achievement'

type AudioContextConstructor = new () => AudioContext

export class SoundEffects {
  private context: AudioContext | null = null
  private isBgmPlaying = false

  // Static audio file instances
  private bgmAudio: HTMLAudioElement | null = null
  private clickAudioPool: HTMLAudioElement[] = []
  private placeAudioPool: HTMLAudioElement[] = []
  private clearAudioPool: HTMLAudioElement[] = []
  private comboAudioPool: HTMLAudioElement[] = []
  private poolIndex = 0

  constructor() {
    this.initAudioPools()
  }

  private initAudioPools(): void {
    if (typeof window === 'undefined') return

    try {
      // Background music using bgm.mp3
      this.bgmAudio = new Audio('/bgm.mp3')
      this.bgmAudio.loop = true
      this.bgmAudio.volume = 0.35
      this.bgmAudio.preload = 'auto'
      this.bgmAudio.addEventListener('error', () => {
        if (this.bgmAudio && !this.bgmAudio.src.includes('/music/bgm.mp3')) {
          this.bgmAudio.src = '/music/bgm.mp3'
          this.bgmAudio.load()
          if (this.isBgmPlaying) {
            this.bgmAudio.play().catch(() => {})
          }
        }
      })
      this.bgmAudio.load()

      // Sound pools for zero-latency rapid playback
      for (let i = 0; i < 4; i++) {
        const click = new Audio('/sounds/click.wav')
        click.volume = 0.4
        click.preload = 'auto'
        click.addEventListener('error', () => {
          click.src = '/click.wav'
        })
        this.clickAudioPool.push(click)

        const place = new Audio('/sounds/place.wav')
        place.volume = 0.55
        place.preload = 'auto'
        place.addEventListener('error', () => {
          place.src = '/place.wav'
        })
        this.placeAudioPool.push(place)

        const clear = new Audio('/sounds/clear.wav')
        clear.volume = 0.65
        clear.preload = 'auto'
        clear.addEventListener('error', () => {
          clear.src = '/sounds/clear.ogg'
        })
        this.clearAudioPool.push(clear)

        const combo = new Audio('/sounds/combo.wav')
        combo.volume = 0.65
        combo.preload = 'auto'
        combo.addEventListener('error', () => {
          combo.src = '/combo.wav'
        })
        this.comboAudioPool.push(combo)
      }
    } catch {
      // Audio pools are non-fatal enhancement
    }
  }

  private playFromPool(pool: HTMLAudioElement[], playbackRate = 1.0, volume = 0.5): boolean {
    if (!pool || pool.length === 0) return false
    try {
      let audio = pool.find((a) => a.paused || a.ended)
      if (!audio) {
        this.poolIndex = (this.poolIndex + 1) % pool.length
        audio = pool[this.poolIndex]
      }
      audio.playbackRate = playbackRate
      audio.volume = volume
      audio.currentTime = 0
      const promise = audio.play()
      if (promise !== undefined) {
        promise.catch(() => {})
      }
      return true
    } catch {
      return false
    }
  }

  private getContext(): AudioContext | null {
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: AudioContextConstructor })
          .webkitAudioContext

      if (!AudioContextClass) return null

      this.context ??= new AudioContextClass()
      if (this.context.state === 'suspended') {
        void this.context.resume()
      }
      return this.context
    } catch {
      return null
    }
  }

  play(effect: SoundEffect, comboLevel = 1): void {
    try {
      // Try playing real audio files first
      if (effect === 'buttonClick') {
        if (this.playFromPool(this.clickAudioPool, 1.0, 0.35)) return
      }

      if (effect === 'placement') {
        if (this.playFromPool(this.placeAudioPool, 1.0, 0.45)) return
      }

      if (effect === 'lineClear') {
        if (this.playFromPool(this.clearAudioPool, 1.0, 0.55)) return
      }

      if (effect === 'multiLine') {
        if (this.playFromPool(this.clearAudioPool, 1.15, 0.7)) return
      }

      if (effect === 'combo') {
        // Escalate playback speed with combo level for exciting pitch climb
        const rate = Math.min(2.0, 1.0 + (comboLevel - 1) * 0.15)
        if (this.playFromPool(this.comboAudioPool, rate, 0.65)) return
      }

      // Procedural Web Audio fallback / custom fanfares
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime

      if (effect === 'buttonClick') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(800, now)
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04)
        gain.gain.setValueAtTime(0.04, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.04)
        return
      }

      if (effect === 'blockPick') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(320, now)
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.06)
        gain.gain.setValueAtTime(0.04, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.06)
        return
      }

      if (effect === 'placement') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(440, now)
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08)
        gain.gain.setValueAtTime(0.06, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.08)
        return
      }

      if (effect === 'lineClear' || effect === 'multiLine') {
        const chord = effect === 'multiLine' ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99]
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, now + idx * 0.04)
          gain.gain.setValueAtTime(0.05, now + idx * 0.04)
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + idx * 0.04)
          osc.stop(now + idx * 0.04 + 0.25)
        })
        return
      }

      if (effect === 'combo') {
        const basePitches = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66]
        const pitch = basePitches[Math.min(comboLevel, basePitches.length - 1)]
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(pitch, now)
        osc.frequency.exponentialRampToValueAtTime(pitch * 1.25, now + 0.18)
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.22)
        return
      }

      if (effect === 'newBest' || effect === 'achievement') {
        // Triumphant ascending fanfare
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, now + idx * 0.08)
          gain.gain.setValueAtTime(0.07, now + idx * 0.08)
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + idx * 0.08)
          osc.stop(now + idx * 0.08 + 0.35)
        })
        return
      }

      if (effect === 'gameOver') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(280, now)
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.45)
        gain.gain.setValueAtTime(0.06, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.45)
        return
      }
    } catch {
      // Audio is an enhancement; gameplay remains uninterrupted if it fails.
    }
  }

  startBgm(): void {
    this.isBgmPlaying = true

    if (!this.bgmAudio) {
      this.bgmAudio = new Audio('/bgm.mp3')
      this.bgmAudio.loop = true
      this.bgmAudio.volume = 0.35
      this.bgmAudio.preload = 'auto'
    }

    if (this.bgmAudio.paused) {
      const playPromise = this.bgmAudio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy prevents autoplay before user interaction, unlock on first gesture
          const unlockAudio = () => {
            if (this.isBgmPlaying && this.bgmAudio) {
              this.bgmAudio.play().catch(() => {})
            }
            window.removeEventListener('pointerdown', unlockAudio)
            window.removeEventListener('keydown', unlockAudio)
          }
          window.addEventListener('pointerdown', unlockAudio, { once: true })
          window.addEventListener('keydown', unlockAudio, { once: true })
        })
      }
    }
  }

  stopBgm(): void {
    this.isBgmPlaying = false
    if (this.bgmAudio) {
      this.bgmAudio.pause()
    }
  }

  dispose(): void {
    this.stopBgm()
    const context = this.context
    this.context = null
    void context?.close()
  }
}
