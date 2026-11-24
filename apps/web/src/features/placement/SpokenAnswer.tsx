import { Emoji } from '../../components/Emoji'
import { useMutation } from '@tanstack/react-query'
import { MAX_RECORDING_MS } from '../../lib/audio'
import { useVoiceRecorder } from '../../lib/useVoiceRecorder'
import { transcribeAudio } from '../dialogue/api'

interface SpokenAnswerProps {
  onDone: (transcript: string) => void
  onSkip: () => void
}

/** Records one spoken answer, shows the transcript, lets the learner redo it. */
export function SpokenAnswer({ onDone, onSkip }: SpokenAnswerProps) {
  const transcribe = useMutation({ mutationFn: transcribeAudio })
  const { isRecording, seconds, micError, start, stop } = useVoiceRecorder({
    onRecorded: (audio) => transcribe.mutate(audio),
  })

  async function begin() {
    transcribe.reset()
    await start()
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
        <button type="button" className="link" onClick={() => void begin()}>
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
        onClick={() => void (isRecording ? stop() : begin())}
        disabled={transcribe.isPending}
      >
        {isRecording
          ? `■ Fine (${seconds}s / ${MAX_RECORDING_MS / 1000}s)`
          : transcribe.isPending
            ? <>Trascrivo <span className="dots" aria-hidden="true" /></>
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
