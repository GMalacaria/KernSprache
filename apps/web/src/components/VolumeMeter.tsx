import { useEffect, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { meterFill } from '../lib/speechLevel'

interface VolumeMeterProps {
  /** Latest microphone volume (RMS), updated by the recorder. */
  level: RefObject<number>
  /** Whether the recording ends by itself on a pause: shows a hint below the bar. */
  autoStops?: boolean
}

/** Bar that follows the voice while recording, so the learner sees the microphone hears them. */
export function VolumeMeter({ level, autoStops = false }: VolumeMeterProps) {
  const { t } = useTranslation()
  const fill = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let shown = 0
    let frame = requestAnimationFrame(function draw() {
      const target = meterFill(level.current ?? 0)
      // Rises at once, falls gently: the bar does not flicker between syllables.
      shown = target > shown ? target : shown * 0.9
      if (fill.current) fill.current.style.transform = `scaleX(${shown.toFixed(3)})`
      frame = requestAnimationFrame(draw)
    })
    return () => cancelAnimationFrame(frame)
  }, [level])

  return (
    <div className="volume-meter">
      <span className="volume-track" aria-hidden="true">
        <span ref={fill} className="volume-fill" />
      </span>
      {autoStops && <p className="muted volume-hint">{t('voice.autoStop')}</p>}
    </div>
  )
}
