import { useStudiedLanguage } from '../features/languages/useLanguage'
import { useMutation } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { MAX_RECORDING_MS, stopSpeaking, unlockSpeech } from '../lib/audio'
import { useVoiceRecorder } from '../lib/useVoiceRecorder'
import { transcribeWithPronunciation } from '../features/dialogue/api'
import { PronunciationNote } from '../features/dialogue/PronunciationNote'
import { Emoji } from './Emoji'
import { VolumeMeter } from './VolumeMeter'

interface RepeatSentenceProps {
  sentence: string
  /** Called with the pronunciation score of each judged attempt (the "Ripeti la frase" exercise of the oral part). */
  onAssessed?: (score: number) => void
}

/** Read a sentence aloud and get its pronunciation judged against the right text. */
export function RepeatSentence({ sentence, onAssessed }: RepeatSentenceProps) {
  const lang = useStudiedLanguage()
  const { t } = useTranslation()
  const assess = useMutation({
    mutationFn: (audio: Blob) => transcribeWithPronunciation(audio, sentence, true, 'repeat'),
    onSuccess: (result) => {
      if (result.pronunciation) onAssessed?.(result.pronunciation.score)
    },
  })
  const { isRecording, seconds, micError, level, autoStops, start, stop } = useVoiceRecorder({
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
    t('voice.stop', { seconds, limit: MAX_RECORDING_MS / 1000 })
  ) : assess.isPending ? (
    <>{t('voice.assessing')} <span className="dots" aria-hidden="true" /></>
  ) : (
    <>
      <Emoji name="microphone" /> {assess.isSuccess ? t('voice.repeatAgain') : t('voice.repeat')}
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
      {isRecording && <VolumeMeter level={level} autoStops={autoStops} />}
      {micError && <p className="error">{micError}</p>}
      {assess.isError && <p className="error">{assess.error.message}</p>}
      {assess.isSuccess && (
        <>
          <p className="muted repeat-heard">
            <Trans t={t} i18nKey="voice.heard" values={{ text: assess.data.text }} components={{ en: <span lang={lang} /> }} />
          </p>
          {assess.data.pronunciation ? (
            <PronunciationNote pronunciation={assess.data.pronunciation} />
          ) : (
            <p className="muted">{t('voice.unclear')}</p>
          )}
        </>
      )}
    </div>
  )
}
