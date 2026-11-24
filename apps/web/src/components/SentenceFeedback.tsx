import { canRecord } from '../lib/audio'
import { ListenButton } from './ListenButton'
import { RepeatSentence } from './RepeatSentence'

interface SentenceFeedbackProps {
  /** English sentence (or word), read aloud on request. */
  en: string
  /** Italian translation shown under it. */
  it?: string | null
}

/** After an answer: the English sentence with a button to hear it, its Italian translation and a way to repeat it aloud. */
export function SentenceFeedback({ en, it }: SentenceFeedbackProps) {
  return (
    <div className="sentence-block">
      <div className="sentence-feedback">
        <ListenButton text={en} className="listen-button" iconSize="1.4em" />
        <div>
          <p lang="en" className="sentence-en">
            {en}
          </p>
          {it && <p className="sentence-it">{it}</p>}
        </div>
      </div>
      {canRecord() && <RepeatSentence sentence={en} />}
    </div>
  )
}
