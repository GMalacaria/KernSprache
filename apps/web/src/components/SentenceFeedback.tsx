import { useStudiedLanguage } from '../features/languages/useLanguage'
import { canRecord } from '../lib/audio'
import { ListenButton } from './ListenButton'
import { RepeatSentence } from './RepeatSentence'

interface SentenceFeedbackProps {
  /** Sentence (or word) in the studied language, read aloud on request. */
  text: string
  /** Translation in the native language, shown under it. */
  translation?: string | null
}

/** After an answer: the sentence with a button to hear it, its translation and a way to repeat it aloud. */
export function SentenceFeedback({ text, translation }: SentenceFeedbackProps) {
  const lang = useStudiedLanguage()
  return (
    <div className="sentence-block">
      <div className="sentence-feedback">
        <ListenButton text={text} className="listen-button" iconSize="1.4em" />
        <div>
          <p lang={lang} className="sentence-en">
            {text}
          </p>
          {translation && <p className="sentence-it">{translation}</p>}
        </div>
      </div>
      {canRecord() && <RepeatSentence sentence={text} />}
    </div>
  )
}
