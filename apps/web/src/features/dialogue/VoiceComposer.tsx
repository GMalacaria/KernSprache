import { useTranslation } from 'react-i18next'
import { Emoji } from '../../components/Emoji'
import { VolumeMeter } from '../../components/VolumeMeter'
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

/** Tap to start speaking; it sends on a pause or on a second tap. The transcript goes to the tutor like a typed message. */
export function VoiceComposer({ disabled, onTranscript, onActivity }: VoiceComposerProps) {
  const { t } = useTranslation()
  const transcribe = useMutation({
    mutationFn: (audio: Blob) => transcribeWithPronunciation(audio, undefined, true),
    onSuccess: ({ text, pronunciation }) => onTranscript(text, pronunciation ?? undefined),
  })
  const { isRecording, seconds, micError, level, autoStops, start, stop, cancel } = useVoiceRecorder({
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
        {isRecording ? t('voice.send', { seconds, limit }) : transcribe.isPending ? (
          <>{t('voice.transcribing')} <span className="dots" aria-hidden="true" /></>
        ) : (
          <>
            <Emoji name="microphone" /> {t('voice.speak')}
          </>
        )}
      </button>
      {isRecording && <VolumeMeter level={level} autoStops={autoStops} />}
      {isRecording && (
        <button
          type="button"
          className="link"
          onClick={cancel}
        >
          {t('voice.cancel')}
        </button>
      )}
      {micError && <p className="error">{micError}</p>}
      {transcribe.isError && <p className="error">{transcribe.error.message}</p>}
    </div>
  )
}
