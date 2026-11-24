import { useState } from 'react'
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
  const [best, setBest] = useState<number | null>(null)

  function assessed(score: number) {
    if (best === null) onAnswered(score >= REPEAT_PASS_SCORE)
    setBest((b) => (b === null ? score : Math.max(b, score)))
  }

  return (
    <div className="stack">
      <div className="sentence-feedback">
        <ListenButton text={sentence.en} className="listen-button" iconSize="1.4em" />
        <div>
          <p lang="en" className="sentence-en">
            {sentence.en}
          </p>
          {sentence.it && <p className="sentence-it">{sentence.it}</p>}
        </div>
      </div>
      <RepeatSentence sentence={sentence.en} onAssessed={assessed} />
      {best !== null && (
        <button type="button" className="next-step" onClick={onDone}>
          Avanti
        </button>
      )}
    </div>
  )
}
