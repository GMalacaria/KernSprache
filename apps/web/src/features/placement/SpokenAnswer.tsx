import { Emoji } from '../../components/Emoji'
import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { MAX_RECORDING_MS, startRecording, type Recording } from '../../lib/audio'
import { transcribeAudio } from '../dialogue/api'

interface SpokenAnswerProps {
  onDone: (transcript: string) => void
  onSkip: () => void
}

/** Records one spoken answer, shows the transcript, lets the learner redo it. */
export function SpokenAnswer({ onDone, onSkip }: SpokenAnswerProps) {
  const recording = useRef<Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)
  const transcribe = useMutation({ mutationFn: transcribeAudio })

  useEffect(() => {
    if (!isRecording) return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [isRecording])

  useEffect(() => () => recording.current?.cancel(), [])

  async function stop() {
    const current = recording.current
    recording.current = null
    setIsRecording(false)
    if (current) transcribe.mutate(await current.stop())
  }

  async function start() {
    setMicError(null)
    transcribe.reset()
    try {
      recording.current = await startRecording(() => void stop())
      setSeconds(0)
      setIsRecording(true)
    } catch {
      setMicError('Non riesco a usare il microfono. Controlla il permesso del browser.')
    }
  }

  if (transcribe.isSuccess) {
    return (
      <div className="stack">
        <p className="muted">Ho capito:</p>
        <p className="bubble transcript" lang="en">
          {transcribe.data}
        </p>
        <button type="button" onClick={() => onDone(transcribe.data)}>
          Avanti
        </button>
        <button type="button" className="link" onClick={() => void start()}>
          Rifai la registrazione
        </button>
      </div>
    )
  }

  return (
    <div className="voice-composer">
      <button
        type="button"
        className={`mic${isRecording ? ' recording' : ''}`}
        onClick={() => void (isRecording ? stop() : start())}
        disabled={transcribe.isPending}
      >
        {isRecording
          ? `■ Fine (${seconds}s / ${MAX_RECORDING_MS / 1000}s)`
          : transcribe.isPending
            ? 'Trascrivo…'
            : (
                <>
                  <Emoji name="microphone" /> Rispondi a voce
                </>
              )}
      </button>
      {!isRecording && !transcribe.isPending && (
        <button type="button" className="link" onClick={onSkip}>
          Non so rispondere, salta
        </button>
      )}
      {micError && <p className="error">{micError}</p>}
      {transcribe.isError && <p className="error">{transcribe.error.message}</p>}
    </div>
  )
}
