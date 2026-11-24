import { canSpeak, speak } from '../lib/audio'
import { Emoji } from './Emoji'

interface SentenceFeedbackProps {
  /** English sentence (or word), read aloud on request. */
  en: string
  /** Italian translation shown under it. */
  it?: string | null
}

/** After an answer: the English sentence with a button to hear it, and its Italian translation. */
export function SentenceFeedback({ en, it }: SentenceFeedbackProps) {
  return (
    <div className="sentence-feedback">
      {canSpeak() && (
        <button type="button" className="listen-button" onClick={() => speak(en)} aria-label={`Ascolta: ${en}`}>
          <Emoji name="speaker" size="1.4em" />
        </button>
      )}
      <div>
        <p lang="en" className="sentence-en">
          {en}
        </p>
        {it && <p className="sentence-it">{it}</p>}
      </div>
    </div>
  )
}
