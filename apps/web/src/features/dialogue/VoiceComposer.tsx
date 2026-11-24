import { Emoji } from '../../components/Emoji'
import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { MAX_RECORDING_MS, startRecording, stopSpeaking, unlockSpeech, type Recording } from '../../lib/audio'
import { transcribeWithPronunciation } from './api'
import type { Pronunciation } from './types'

interface VoiceComposerProps {
  disabled: boolean
  onTranscript: (text: string, pronunciation?: Pronunciation) => void
  /** Called while recording so the study timer knows the learner is active. */
  onActivity?: () => void
}

/** Tap to start speaking, tap again to send. The transcript goes to the tutor like a typed message. */
export function VoiceComposer({ disabled, onTranscript, onActivity }: VoiceComposerProps) {
  const recording = useRef<Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)

  const transcribe = useMutation({
    mutationFn: transcribeWithPronunciation,
    onSuccess: ({ text, pronunciation }) => onTranscript(text, pronunciation ?? undefined),
  })

  useEffect(() => {
    if (!isRecording) return
    const id = window.setInterval(() => {
      setSeconds((s) => s + 1)
      onActivity?.()
    }, 1000)
    return () => window.clearInterval(id)
  }, [isRecording, onActivity])

  useEffect(() => () => recording.current?.cancel(), [])

  async function stopAndSend() {
    const current = recording.current
    recording.current = null
    setIsRecording(false)
    if (!current) return
    const audio = await current.stop()
    transcribe.mutate(audio)
  }

  async function toggle() {
    if (isRecording) {
      await stopAndSend()
      return
    }
    unlockSpeech()
    stopSpeaking()
    setMicError(null)
    transcribe.reset()
    try {
      recording.current = await startRecording(() => void stopAndSend())
      setSeconds(0)
      setIsRecording(true)
    } catch {
      setMicError('Non riesco a usare il microfono. Controlla di aver dato il permesso al browser.')
    }
  }

  const busy = disabled || transcribe.isPending
  const limit = Math.round(MAX_RECORDING_MS / 1000)

  return (
    <div className="voice-composer">
      <button
        type="button"
        className={`mic${isRecording ? ' recording' : ''}`}
        onClick={() => void toggle()}
        disabled={busy && !isRecording}
        aria-pressed={isRecording}
      >
        {isRecording ? `■ Invia (${seconds}s / ${limit}s)` : transcribe.isPending ? (
          'Trascrivo…'
        ) : (
          <>
            <Emoji name="microphone" /> Parla
          </>
        )}
      </button>
      {isRecording && (
        <button
          type="button"
          className="link"
          onClick={() => {
            recording.current?.cancel()
            recording.current = null
            setIsRecording(false)
          }}
        >
          Annulla
        </button>
      )}
      {micError && <p className="error">{micError}</p>}
      {transcribe.isError && <p className="error">{transcribe.error.message}</p>}
    </div>
  )
}
