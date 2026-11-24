import { useSyncExternalStore, type ReactNode } from 'react'
import { canSpeak, getSpeechLoading, speak, subscribeSpeechLoading } from '../lib/audio'
import { Emoji } from './Emoji'

interface ListenButtonProps {
  /** English text read aloud on tap. */
  text: string
  /** Visible text next to the icon; without it the button is icon-only and labelled for screen readers. */
  label?: ReactNode
  className?: string
  iconSize?: string
}

/** Speaker button: shows a spinner in place of the icon while the voice is being prepared. */
export function ListenButton({ text, label, className, iconSize }: ListenButtonProps) {
  const loading = useSyncExternalStore(subscribeSpeechLoading, getSpeechLoading) === text
  if (!canSpeak()) return null
  return (
    <button
      type="button"
      className={className}
      onClick={() => speak(text)}
      aria-label={label ? undefined : `Ascolta: ${text}`}
      aria-busy={loading}
    >
      {loading ? (
        <span className="spinner" style={iconSize ? { width: iconSize, height: iconSize } : undefined} aria-hidden="true" />
      ) : (
        <Emoji name="speaker" size={iconSize} />
      )}
      {label && <> {label}</>}
      {loading && <span className="visually-hidden" role="status">Preparo l'audio</span>}
    </button>
  )
}
