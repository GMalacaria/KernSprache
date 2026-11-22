// Microphone recording (MediaRecorder) and text-to-speech (speechSynthesis).

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
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Reads English text aloud, slightly slower than normal for a learner. */
export function speak(text: string): void {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = englishVoice()
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? 'en-GB'
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}

/**
 * iOS only allows speech started from a user gesture. Speaking an empty
 * utterance on a tap unlocks later, programmatic speak() calls.
 */
export function unlockSpeech(): void {
  if (!canSpeak()) return
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel()
}
