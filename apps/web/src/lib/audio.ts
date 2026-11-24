// Microphone recording (MediaRecorder) and text-to-speech: a Gemini voice (function `speak`,
// cached on the server) with the browser's own voice (speechSynthesis) as a fallback.
import { supabase } from './supabase'

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
}

export const MAX_RECORDING_MS = 60_000

/** Starts recording from the microphone. Stops by itself after MAX_RECORDING_MS. */
export async function startRecording(onAutoStop: () => void): Promise<Recording> {
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
  const timer = window.setTimeout(onAutoStop, MAX_RECORDING_MS)

  return {
    stop: () => {
      window.clearTimeout(timer)
      if (recorder.state !== 'inactive') recorder.stop()
      return stopped
    },
    cancel: () => {
      window.clearTimeout(timer)
      recorder.onstop = () => stream.getTracks().forEach((t) => t.stop())
      if (recorder.state !== 'inactive') recorder.stop()
    },
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

async function fetchClip(text: string): Promise<string> {
  const cached = clips.get(text)
  if (cached) return cached
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
  const url = await Promise.race([
    fetchClip(text),
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), REMOTE_TIMEOUT_MS)),
  ])
  if (token !== speakToken) return
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
    if (token === speakToken) speakWithBrowser(text)
  })
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
  player?.pause()
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}
