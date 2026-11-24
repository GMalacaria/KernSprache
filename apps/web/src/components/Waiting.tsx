import { useEffect, useState } from 'react'
import { Emoji, type EmojiName } from './Emoji'

const ICONS: EmojiName[] = ['speaker', 'microphone', 'airplane', 'briefcase', 'heart', 'clapper', 'stopwatch', 'party']

interface WaitingProps {
  /** What is happening right now, e.g. "Calcolo il tuo livello". Announced to screen readers. */
  title: string
  /** Short lines that rotate while the wait goes on (long waits only). */
  hints?: string[]
  /** Smaller version for quick loads where only the icons and the title fit. */
  compact?: boolean
}

const HINT_MS = 3500

/** Waiting screen: a belt of icons scrolls past while the title says what is being done. */
export function Waiting({ title, hints = [], compact = false }: WaitingProps) {
  const [hint, setHint] = useState(0)
  useEffect(() => {
    if (hints.length < 2) return
    const id = window.setInterval(() => setHint((h) => (h + 1) % hints.length), HINT_MS)
    return () => window.clearInterval(id)
  }, [hints.length])

  // The belt holds the set twice, so shifting it by half a turn loops seamlessly.
  return (
    <div className={`waiting${compact ? ' waiting-compact' : ''}`} role="status">
      <div className="waiting-belt" aria-hidden="true">
        <div className="waiting-track">
          {[0, 1].flatMap((copy) =>
            ICONS.map((name, i) => (
              <span key={`${copy}-${name}`} className="waiting-icon" style={{ animationDelay: `${i * -0.25}s` }}>
                <Emoji name={name} size={compact ? '2rem' : '2.75rem'} />
              </span>
            )),
          )}
        </div>
      </div>
      <p className="waiting-title">{title}</p>
      {!compact && hints.length > 0 && (
        <p key={hint} className="waiting-hint muted" aria-hidden="true">
          {hints[hint]}
        </p>
      )}
    </div>
  )
}
