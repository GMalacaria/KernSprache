import { i18n } from '../i18n'
import { useCallback, useEffect, useRef, useState } from 'react'
import { startRecording, type Recording } from './audio'
import { SHORT_SILENCE_MS } from './speechLevel'

interface Options {
  /** Called with the audio when the recording ends, by the learner or at the time limit. */
  onRecorded: (audio: Blob) => void
  /** Called every second while recording: the study timer counts it as activity. */
  onTick?: () => void
  /**
   * Pause after speech that ends the recording by itself (ms). Defaults to SHORT_SILENCE_MS; longer
   * for answers that need thinking, null to end only on a tap.
   */
  silenceMs?: number | null
}

/** Microphone recording shared by the oral dialogue and the spoken answers: state, timer, cleanup. */
export function useVoiceRecorder({ onRecorded, onTick, silenceMs = SHORT_SILENCE_MS }: Options) {
  const recording = useRef<Recording | null>(null)
  /** Latest microphone volume (RMS), read by VolumeMeter on each frame without re-rendering. */
  const level = useRef(0)
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)

  // The callbacks are read through refs so the interval and the auto-stop never go stale.
  const onRecordedRef = useRef(onRecorded)
  const onTickRef = useRef(onTick)
  useEffect(() => {
    onRecordedRef.current = onRecorded
    onTickRef.current = onTick
  })

  useEffect(() => {
    if (!isRecording) return
    const id = window.setInterval(() => {
      setSeconds((s) => s + 1)
      onTickRef.current?.()
    }, 1000)
    return () => window.clearInterval(id)
  }, [isRecording])

  useEffect(() => () => recording.current?.cancel(), [])

  const stop = useCallback(async () => {
    const current = recording.current
    recording.current = null
    setIsRecording(false)
    if (!current) return
    const audio = await current.stop()
    // A silent recording is not sent: nothing to transcribe, and nothing to grade.
    if (!current.heardSpeech()) {
      setMicError(i18n.t('voice.noSpeech'))
      return
    }
    onRecordedRef.current(audio)
  }, [])

  const start = useCallback(async () => {
    setMicError(null)
    try {
      level.current = 0
      recording.current = await startRecording(() => void stop(), {
        onLevel: (rms) => {
          level.current = rms
        },
        silenceMs: silenceMs ?? undefined,
      })
      setSeconds(0)
      setIsRecording(true)
    } catch {
      setMicError(i18n.t('voice.micError'))
    }
  }, [stop, silenceMs])

  /** Stops and throws the audio away. */
  const cancel = useCallback(() => {
    recording.current?.cancel()
    recording.current = null
    setIsRecording(false)
  }, [])

  return { isRecording, seconds, micError, level, autoStops: silenceMs !== null, start, stop, cancel }
}
