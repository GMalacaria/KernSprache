// Short sound effects for right and wrong answers, synthesised with Web Audio (no files to download).
// On iOS the silent switch mutes them, which is what a learner in a quiet place expects.

const STORAGE_KEY = 'kernsprache.sounds'

export function soundsEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // Storage blocked: the choice just lasts until the page is closed.
  }
}

interface Note {
  /** Frequency in Hz. */
  freq: number
  /** Seconds after the sound starts. */
  at: number
  /** Length in seconds. */
  length: number
  type: OscillatorType
  volume: number
}

let context: AudioContext | undefined

function audioContext(): AudioContext | undefined {
  if (typeof window === 'undefined') return undefined
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return undefined
  context ??= new Ctor()
  return context
}

function play(notes: Note[]): void {
  if (!soundsEnabled()) return
  const ctx = audioContext()
  if (!ctx) return
  void ctx.resume()
  const start = ctx.currentTime + 0.01
  for (const note of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = note.type
    osc.frequency.value = note.freq
    const t0 = start + note.at
    // A quick attack and a decay to silence avoid clicks.
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(note.volume, t0 + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.length)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + note.length + 0.02)
  }
}

/** Two rising notes: a bright "ding-ding". */
export function playCorrect(): void {
  play([
    { freq: 659.25, at: 0, length: 0.14, type: 'triangle', volume: 0.22 }, // E5
    { freq: 987.77, at: 0.1, length: 0.28, type: 'triangle', volume: 0.22 }, // B5
  ])
}

/** Two falling low notes: a soft, short "bu-buh". */
export function playWrong(): void {
  play([
    { freq: 233.08, at: 0, length: 0.16, type: 'sawtooth', volume: 0.13 }, // A#3
    { freq: 174.61, at: 0.14, length: 0.3, type: 'sawtooth', volume: 0.13 }, // F3
  ])
}
