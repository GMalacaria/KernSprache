// Microphone recording (MediaRecorder) and text-to-speech: a Gemini voice (function `speak`,
// cached on the server) with the browser's own voice (speechSynthesis) as a fallback.
import { supabase } from './supabase'
import { containsSpeech, endOfSpeech, READING_MS } from './speechLevel'

/** First container the browser can record: webm/ogg on Android and desktop, mp4 on iOS Safari. */
export function pickRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

export function canRecord(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && pickRecordingMimeType() !== undefined
}

export interface Recording {
  /** Stops recording and resolves with the audio. */
  stop: () => Promise<Blob>
  /** Stops recording and discards the audio. */
  cancel: () => void
  /** Whether the microphone picked up anything louder than background noise (true if it cannot tell). */
  heardSpeech: () => boolean
}

export interface LevelListeners {
  /** Called with each volume reading (RMS, 0-1), every READING_MS: drives the volume meter. */
  onLevel?: (rms: number) => void
  /** Called once when the learner has spoken and then stayed quiet for `silenceMs`. */
  onEndOfSpeech?: () => void
  /** Pause after speech that calls onEndOfSpeech; without it the recording only ends on a tap. */
  silenceMs?: number
}

/**
 * Listens to the microphone stream while it records and keeps its volume every READING_MS, so a
 * silent recording is never sent to be transcribed (the model would invent the expected sentence
 * and grade it), the meter follows the voice and the recording can end on a pause.
 */
function watchLevels(stream: MediaStream, listeners: LevelListeners): { levels: number[]; close: () => void } | null {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  try {
    const ctx = new Ctx()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    const levels: number[] = []
    let ended = false
    const id = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples)
      let sum = 0
      for (const v of samples) sum += v * v
      const rms = Math.sqrt(sum / samples.length)
      levels.push(rms)
      listeners.onLevel?.(rms)
      if (!ended && listeners.silenceMs !== undefined && endOfSpeech(levels, listeners.silenceMs)) {
        ended = true
        listeners.onEndOfSpeech?.()
      }
    }, READING_MS)
    return {
      levels,
      close: () => {
        window.clearInterval(id)
        void ctx.close().catch(() => undefined)
      },
    }
  } catch {
    return null
  }
}

export const MAX_RECORDING_MS = 60_000

/**
 * Starts recording from the microphone. Calls onAutoStop after MAX_RECORDING_MS, or after a pause
 * once the learner has spoken if `listeners.silenceMs` is set.
 */
export async function startRecording(onAutoStop: () => void, listeners: LevelListeners = {}): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickRecordingMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }))
    }
  })
  recorder.start()
  const watcher = watchLevels(stream, { ...listeners, onEndOfSpeech: onAutoStop })
  const timer = window.setTimeout(onAutoStop, MAX_RECORDING_MS)

  return {
    stop: () => {
      window.clearTimeout(timer)
      watcher?.close()
      if (recorder.state !== 'inactive') recorder.stop()
      return stopped
    },
    cancel: () => {
      window.clearTimeout(timer)
      watcher?.close()
      recorder.onstop = () => stream.getTracks().forEach((t) => t.stop())
      if (recorder.state !== 'inactive') recorder.stop()
    },
    // Without a way to measure (old browser) the recording is sent as before.
    heardSpeech: () => (watcher ? containsSpeech(watcher.levels) : true),
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function englishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en'))
  )
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && ('Audio' in window || 'speechSynthesis' in window)
}

/** A silent, empty WAV: playing it on a tap lets this element play later without another tap (iOS). */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
/** The Gemini voice is slightly slowed for a learner. */
const PLAYBACK_RATE = 0.95
/** Past this, the browser voice takes over instead of leaving the learner waiting. */
const REMOTE_TIMEOUT_MS = 8000
const MAX_CACHED_CLIPS = 60

let player: HTMLAudioElement | undefined
let primed = false
/** Bumped by every speak() and stopSpeaking(): a late answer from the server is dropped if it is stale. */
let speakToken = 0
/** Sentence -> object URL of its audio, so a replay in the same session is instant. */
const clips = new Map<string, string>()
/** Downloads in flight: a tap during a prefetch waits for the same request instead of starting another. */
const pending = new Map<string, Promise<string>>()

/** Sentence the learner asked to hear and is still waiting for (generation or download), if any. */
let loadingText: string | null = null
const listeners = new Set<() => void>()

function setLoading(text: string | null): void {
  if (loadingText === text) return
  loadingText = text
  listeners.forEach((l) => l())
}

/** For useSyncExternalStore: the sentence whose audio is loading after a tap. */
export function subscribeSpeechLoading(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSpeechLoading(): string | null {
  return loadingText
}

function getPlayer(): HTMLAudioElement {
  player ??= new Audio()
  return player
}

function primePlayer(): void {
  if (primed || typeof Audio === 'undefined') return
  primed = true
  const el = getPlayer()
  el.src = SILENT_WAV
  void el.play().catch(() => {
    primed = false
  })
}

function fetchClip(text: string): Promise<string> {
  const cached = clips.get(text)
  if (cached) return Promise.resolve(cached)
  const inFlight = pending.get(text)
  if (inFlight) return inFlight
  const request = downloadClip(text).finally(() => pending.delete(text))
  pending.set(text, request)
  return request
}

async function downloadClip(text: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ path: string }>('speak', { body: { text } })
  if (error || !data?.path) throw new Error('speak failed')
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}${data.path}`)
  if (!response.ok) throw new Error('audio download failed')
  const url = URL.createObjectURL(await response.blob())
  clips.set(text, url)
  if (clips.size > MAX_CACHED_CLIPS) {
    const oldest = clips.keys().next().value
    if (oldest !== undefined) {
      URL.revokeObjectURL(clips.get(oldest) ?? '')
      clips.delete(oldest)
    }
  }
  return url
}

async function speakWithGemini(text: string, token: number): Promise<void> {
  if (!clips.has(text)) setLoading(text)
  const url = await Promise.race([
    fetchClip(text),
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), REMOTE_TIMEOUT_MS)),
  ])
  if (token !== speakToken) return
  setLoading(null)
  const el = getPlayer()
  el.src = url
  el.playbackRate = PLAYBACK_RATE
  await el.play()
}

function speakWithBrowser(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = englishVoice()
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? 'en-GB'
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}

/** Reads English text aloud with the Gemini voice; falls back to the browser voice if that fails. */
export function speak(text: string): void {
  if (!canSpeak()) return
  stopSpeaking()
  const token = speakToken
  primePlayer()
  void speakWithGemini(text, token).catch(() => {
    if (token !== speakToken) return
    setLoading(null)
    speakWithBrowser(text)
  })
}

/**
 * Generates and downloads the audio of sentences the learner is going to hear anyway (one at a
 * time, in order), so the tap plays at once. Failures are ignored: speak() retries on demand.
 */
export async function prefetchSpeech(texts: string[]): Promise<void> {
  if (typeof Audio === 'undefined') return
  for (const text of new Set(texts)) {
    if (!text.trim()) continue
    try {
      await fetchClip(text)
    } catch {
      // speak() will try again, or use the browser voice.
    }
  }
}

/**
 * iOS only allows audio and speech started from a user gesture. Calling this on a tap unlocks
 * later, programmatic speak() calls (the tutor's reply in the oral dialogue).
 */
export function unlockSpeech(): void {
  primePlayer()
  if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
}

export function stopSpeaking(): void {
  speakToken++
  setLoading(null)
  player?.pause()
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}
