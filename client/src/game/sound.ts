export type SoundEffect =
  | 'placement'
  | 'lineClear'
  | 'combo'
  | 'gameOver'

type AudioContextConstructor = new () => AudioContext

export class SoundEffects {
  private context: AudioContext | null = null

  play(effect: SoundEffect): void {
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: AudioContextConstructor })
          .webkitAudioContext

      if (!AudioContextClass) {
        return
      }

      this.context ??= new AudioContextClass()
      void this.context.resume()

      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      const now = this.context.currentTime
      const settings = {
        placement: { frequency: 420, duration: 0.09, volume: 0.045 },
        lineClear: { frequency: 620, duration: 0.16, volume: 0.06 },
        combo: { frequency: 820, duration: 0.2, volume: 0.07 },
        gameOver: { frequency: 180, duration: 0.35, volume: 0.06 },
      }[effect]

      oscillator.type = effect === 'gameOver' ? 'sine' : 'triangle'
      oscillator.frequency.setValueAtTime(settings.frequency, now)
      gain.gain.setValueAtTime(settings.volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + settings.duration)
      oscillator.connect(gain)
      gain.connect(this.context.destination)
      oscillator.start(now)
      oscillator.stop(now + settings.duration)
    } catch {
      // Audio is an enhancement; gameplay remains available if it fails.
    }

  }

  dispose(): void {
    const context = this.context
    this.context = null
    void context?.close()
  }
}
