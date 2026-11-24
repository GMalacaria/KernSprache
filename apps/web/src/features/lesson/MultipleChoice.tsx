import { useState } from 'react'
import { SentenceFeedback } from '../../components/SentenceFeedback'
import { playCorrect, playWrong } from '../../lib/sounds'
import type { QuizQuestion } from './types'

interface MultipleChoiceProps {
  question: QuizQuestion
  onAnswered: (correct: boolean) => void
}

/** One question: pick an option, see right/wrong, then continue. */
export function MultipleChoice({ question, onAnswered }: MultipleChoiceProps) {
  const [chosen, setChosen] = useState<number | null>(null)
  const answered = chosen !== null
  const correct = chosen === question.answer

  return (
    <div className="quiz">
      <p className="quiz-prompt">{question.prompt}</p>
      <div className="stack">
        {question.options.map((option, i) => {
          const state = !answered ? '' : i === question.answer ? ' right' : i === chosen ? ' wrong' : ''
          return (
            <button
              key={`${i}-${option}`}
              type="button"
              className={`option${state}`}
              lang={question.optionsLang}
              disabled={answered}
              onClick={() => {
                setChosen(i)
                if (i === question.answer) playCorrect()
                else playWrong()
              }}
            >
              {option}
            </button>
          )
        })}
      </div>
      {answered && (
        <div className={`quiz-feedback ${correct ? 'is-right' : 'is-wrong'}`} role="status">
          <p className={correct ? 'ok' : 'error'}>
            <strong>
              {correct ? 'Giusto!' : `Non proprio: la risposta giusta è "${question.options[question.answer]}".`}
            </strong>
          </p>
          {question.feedback && <SentenceFeedback en={question.feedback.en} it={question.feedback.it} />}
          <button type="button" onClick={() => onAnswered(correct)}>
            Avanti
          </button>
        </div>
      )}
    </div>
  )
}
