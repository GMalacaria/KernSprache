import { useCallback, useEffect, useRef, useState } from 'react'
import { startRecording, type Recording } from './audio'

export const MIC_ERROR = 'Non riesco a usare il microfono. Controlla di aver dato il permesso al browser.'

interface Options {
  /** Called with the audio when the recording ends, by the learner or at the time limit. */
  onRecorded: (audio: Blob) => void
  /** Called every second while recording: the study timer counts it as activity. */
  onTick?: () => void
}

/** Microphone recording shared by the oral dialogue and the spoken answers: state, timer, cleanup. */
export function useVoiceRecorder({ onRecorded, onTick }: Options) {
  const recording = useRef<Recording | null>(null)
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
    if (current) onRecordedRef.current(await current.stop())
  }, [])

  const start = useCallback(async () => {
    setMicError(null)
    try {
      recording.current = await startRecording(() => void stop())
      setSeconds(0)
      setIsRecording(true)
    } catch {
      setMicError(MIC_ERROR)
    }
  }, [stop])

  /** Stops and throws the audio away. */
  const cancel = useCallback(() => {
    recording.current?.cancel()
    recording.current = null
    setIsRecording(false)
  }, [])

  return { isRecording, seconds, micError, start, stop, cancel }
}
