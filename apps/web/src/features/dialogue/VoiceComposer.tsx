import { Emoji } from '../../components/Emoji'
import { useMutation } from '@tanstack/react-query'
import { MAX_RECORDING_MS, stopSpeaking, unlockSpeech } from '../../lib/audio'
import { useVoiceRecorder } from '../../lib/useVoiceRecorder'
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
  const transcribe = useMutation({
    mutationFn: (audio: Blob) => transcribeWithPronunciation(audio, undefined, true),
    onSuccess: ({ text, pronunciation }) => onTranscript(text, pronunciation ?? undefined),
  })
  const { isRecording, seconds, micError, start, stop, cancel } = useVoiceRecorder({
    onRecorded: (audio) => transcribe.mutate(audio),
    onTick: onActivity,
  })

  async function toggle() {
    if (isRecording) {
      await stop()
      return
    }
    unlockSpeech()
    stopSpeaking()
    transcribe.reset()
    await start()
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
          <>Trascrivo <span className="dots" aria-hidden="true" /></>
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
          onClick={cancel}
        >
          Annulla
        </button>
      )}
      {micError && <p className="error">{micError}</p>}
      {transcribe.isError && <p className="error">{transcribe.error.message}</p>}
    </div>
  )
}
