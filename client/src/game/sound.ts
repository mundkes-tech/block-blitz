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
  private bgmIntervalId: number | null = null
  private bgmGain: GainNode | null = null
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
      // Background music
      this.bgmAudio = new Audio('/music/bgm.mp3')
      this.bgmAudio.loop = true
      this.bgmAudio.volume = 0.25

      // Sound pools for zero-latency rapid playback
      for (let i = 0; i < 3; i++) {
        const click = new Audio('/sounds/click.wav')
        click.volume = 0.35
        this.clickAudioPool.push(click)

        const place = new Audio('/sounds/place.wav')
        place.volume = 0.45
        this.placeAudioPool.push(place)

        const clear = new Audio('/sounds/clear.ogg')
        clear.volume = 0.55
        this.clearAudioPool.push(clear)

        const combo = new Audio('/sounds/combo.wav')
        combo.volume = 0.6
        this.comboAudioPool.push(combo)
      }
    } catch {
      // Audio pools are non-fatal enhancement
    }
  }

  private playFromPool(pool: HTMLAudioElement[], playbackRate = 1.0, volume = 0.5): boolean {
    if (!pool || pool.length === 0) return false
    try {
      this.poolIndex = (this.poolIndex + 1) % pool.length
      const audio = pool[this.poolIndex]
      audio.playbackRate = playbackRate
      audio.volume = volume
      audio.currentTime = 0
      const promise = audio.play()
      if (promise !== undefined) {
        promise.catch(() => {
          // Playback error caught safely
        })
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
    if (this.isBgmPlaying) return
    this.isBgmPlaying = true

    // Try playing real BGM file first
    if (this.bgmAudio) {
      this.bgmAudio.currentTime = 0
      const playPromise = this.bgmAudio.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            return
          })
          .catch(() => {
            // If browser blocks audio file playback, fall back to Web Audio synth
            this.startSynthBgm()
          })
        return
      }
    }

    this.startSynthBgm()
  }

  private startSynthBgm(): void {
    const ctx = this.getContext()
    if (!ctx) return

    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]
    let step = 0

    this.bgmGain = ctx.createGain()
    this.bgmGain.gain.setValueAtTime(0.015, ctx.currentTime)
    this.bgmGain.connect(ctx.destination)

    this.bgmIntervalId = window.setInterval(() => {
      if (!this.isBgmPlaying || !this.context) return
      try {
        const noteCtx = this.context
        const now = noteCtx.currentTime
        const note = scale[step % scale.length]
        step = (step + 1) % scale.length

        const osc = noteCtx.createOscillator()
        const gain = noteCtx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(note, now)
        gain.gain.setValueAtTime(0.012, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)

        osc.connect(gain)
        if (this.bgmGain) {
          gain.connect(this.bgmGain)
        }
        osc.start(now)
        osc.stop(now + 0.6)
      } catch {
        // ignore tick glitch
      }
    }, 600)
  }

  stopBgm(): void {
    this.isBgmPlaying = false
    if (this.bgmAudio) {
      this.bgmAudio.pause()
      this.bgmAudio.currentTime = 0
    }
    if (this.bgmIntervalId !== null) {
      window.clearInterval(this.bgmIntervalId)
      this.bgmIntervalId = null
    }
  }

  dispose(): void {
    this.stopBgm()
    const context = this.context
    this.context = null
    void context?.close()
  }
}
