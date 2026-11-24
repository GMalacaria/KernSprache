import { useMutation } from '@tanstack/react-query'
import { MAX_RECORDING_MS, stopSpeaking, unlockSpeech } from '../lib/audio'
import { useVoiceRecorder } from '../lib/useVoiceRecorder'
import { transcribeWithPronunciation } from '../features/dialogue/api'
import { PronunciationNote } from '../features/dialogue/PronunciationNote'
import { Emoji } from './Emoji'

interface RepeatSentenceProps {
  sentence: string
  /** Called with the pronunciation score of each judged attempt (the "Ripeti la frase" exercise of the oral part). */
  onAssessed?: (score: number) => void
}

/** Read a sentence aloud and get its pronunciation judged against the right text. */
export function RepeatSentence({ sentence, onAssessed }: RepeatSentenceProps) {
  const assess = useMutation({
    mutationFn: (audio: Blob) => transcribeWithPronunciation(audio, sentence, true),
    onSuccess: (result) => {
      if (result.pronunciation) onAssessed?.(result.pronunciation.score)
    },
  })
  const { isRecording, seconds, micError, start, stop } = useVoiceRecorder({
    onRecorded: (audio) => assess.mutate(audio),
  })

  async function toggle() {
    if (isRecording) {
      await stop()
      return
    }
    unlockSpeech()
    stopSpeaking()
    assess.reset()
    await start()
  }

  const label = isRecording ? (
    `■ Fine (${seconds}s / ${MAX_RECORDING_MS / 1000}s)`
  ) : assess.isPending ? (
    <>Valuto la pronuncia <span className="dots" aria-hidden="true" /></>
  ) : (
    <>
      <Emoji name="microphone" /> {assess.isSuccess ? 'Riprova a ripetere' : 'Ripeti la frase'}
    </>
  )

  return (
    <div className="repeat-sentence">
      <button
        type="button"
        className={`secondary${isRecording ? ' recording' : ''}`}
        onClick={() => void toggle()}
        disabled={assess.isPending}
        aria-pressed={isRecording}
      >
        {label}
      </button>
      {micError && <p className="error">{micError}</p>}
      {assess.isError && <p className="error">{assess.error.message}</p>}
      {assess.isSuccess && (
        <>
          <p className="muted repeat-heard">
            Ho sentito: <span lang="en">{assess.data.text}</span>
          </p>
          {assess.data.pronunciation ? (
            <PronunciationNote pronunciation={assess.data.pronunciation} />
          ) : (
            <p className="muted">Non riesco a valutarla: riprova avvicinando il telefono.</p>
          )}
        </>
      )}
    </div>
  )
}
