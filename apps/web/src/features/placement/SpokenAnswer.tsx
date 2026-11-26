import { useStudiedLanguage } from '../languages/useLanguage'
import { Emoji } from '../../components/Emoji'
import { VolumeMeter } from '../../components/VolumeMeter'
import { useMutation } from '@tanstack/react-query'
import { MAX_RECORDING_MS } from '../../lib/audio'
import { useVoiceRecorder } from '../../lib/useVoiceRecorder'
import { LONG_SILENCE_MS } from '../../lib/speechLevel'
import { transcribeAudio } from '../dialogue/api'
import { useTranslation } from 'react-i18next'

interface SpokenAnswerProps {
  onDone: (transcript: string) => void
  onSkip: () => void
}

/** Records one spoken answer, shows the transcript, lets the learner redo it. */
export function SpokenAnswer({ onDone, onSkip }: SpokenAnswerProps) {
  const lang = useStudiedLanguage()
  const { t } = useTranslation(['tests', 'common'])
  const transcribe = useMutation({ mutationFn: transcribeAudio })
  const { isRecording, seconds, micError, level, autoStops, start, stop } = useVoiceRecorder({
    onRecorded: (audio) => transcribe.mutate(audio),
    // Test answers are longer and need thinking between sentences.
    silenceMs: LONG_SILENCE_MS,
  })

  async function begin() {
    transcribe.reset()
    await start()
  }

  if (transcribe.isSuccess) {
    return (
      <div className="stack">
        <p className="muted">{t('spoken.heard')}</p>
        <p className="bubble transcript" lang={lang}>
          {transcribe.data}
        </p>
        <button type="button" onClick={() => onDone(transcribe.data)}>
          {t('common:actions.next')}
        </button>
        <button type="button" className="link" onClick={() => void begin()}>
          {t('spoken.redo')}
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
          ? t('common:voice.stop', { seconds, limit: MAX_RECORDING_MS / 1000 })
          : transcribe.isPending
            ? <>{t('common:voice.transcribing')} <span className="dots" aria-hidden="true" /></>
            : (
                <>
                  <Emoji name="microphone" /> {t('spoken.answer')}
                </>
              )}
      </button>
      {isRecording && <VolumeMeter level={level} autoStops={autoStops} />}
      {!isRecording && !transcribe.isPending && (
        <button type="button" className="link" onClick={onSkip}>
          {t('spoken.skip')}
        </button>
      )}
      {micError && <p className="error">{micError}</p>}
      {transcribe.isError && <p className="error">{transcribe.error.message}</p>}
    </div>
  )
}
