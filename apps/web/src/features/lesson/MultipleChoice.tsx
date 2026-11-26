import { useStudiedLanguage } from '../languages/useLanguage'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDock } from './useDock'
import { SentenceFeedback } from '../../components/SentenceFeedback'
import { playCorrect, playWrong } from '../../lib/sounds'
import type { QuizQuestion } from './types'

interface MultipleChoiceProps {
  question: QuizQuestion
  onAnswered: (correct: boolean) => void
}

/** One question: pick an option, see right/wrong, then continue. */
export function MultipleChoice({ question, onAnswered }: MultipleChoiceProps) {
  const { t } = useTranslation(['lesson', 'common'])
  const lang = useStudiedLanguage()
  const [chosen, setChosen] = useState<number | null>(null)
  const answered = chosen !== null
  const correct = chosen === question.answer
  const dock = useDock<HTMLDivElement>(answered)

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
              lang={question.optionsStudied ? lang : undefined}
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
        <div ref={dock} className={`quiz-feedback quiz-dock ${correct ? 'is-right' : 'is-wrong'}`} role="status">
          <p className={correct ? 'ok' : 'error'}>
            <strong>
              {correct ? t('quiz.right') : t('quiz.wrong', { answer: question.options[question.answer] })}
            </strong>
          </p>
          {question.feedback && <SentenceFeedback text={question.feedback.text} translation={question.feedback.translation} />}
          <button type="button" onClick={() => onAnswered(correct)}>
            {t('common:actions.next')}
          </button>
        </div>
      )}
    </div>
  )
}
