import { useStudiedLanguage } from '../languages/useLanguage'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ListenButton } from '../../components/ListenButton'
import { RepeatSentence } from '../../components/RepeatSentence'
import type { DictationSentence } from './dictation'
import { REPEAT_PASS_SCORE } from './parts'

interface RepeatExerciseProps {
  sentence: DictationSentence
  /** The first judged attempt counts as the answer: right from REPEAT_PASS_SCORE. */
  onAnswered: (correct: boolean) => void
  onDone: () => void
}

/** Oral part: listen to a sentence and read it aloud; the pronunciation score is the grade. */
export function RepeatExercise({ sentence, onAnswered, onDone }: RepeatExerciseProps) {
  const lang = useStudiedLanguage()
  const { t } = useTranslation()
  const [best, setBest] = useState<number | null>(null)

  function assessed(score: number) {
    if (best === null) onAnswered(score >= REPEAT_PASS_SCORE)
    setBest((b) => (b === null ? score : Math.max(b, score)))
  }

  return (
    <div className="stack">
      <div className="sentence-feedback">
        <ListenButton text={sentence.text} className="listen-button" iconSize="1.4em" />
        <div>
          <p lang={lang} className="sentence-en">
            {sentence.text}
          </p>
          {sentence.translation && <p className="sentence-it">{sentence.translation}</p>}
        </div>
      </div>
      <RepeatSentence sentence={sentence.text} onAssessed={assessed} />
      {best !== null && (
        <button type="button" className="next-step" onClick={onDone}>
          {t('actions.next')}
        </button>
      )}
    </div>
  )
}
