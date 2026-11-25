import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useDock } from './useDock'
import { SentenceFeedback } from '../../components/SentenceFeedback'
import { ListenButton } from '../../components/ListenButton'
import { playCorrect, playWrong } from '../../lib/sounds'
import {
  compareDictation,
  dictationScore,
  type DictationComparison,
  type DictationSentence,
  TEXT_SHOWN_PENALTY,
  WRONG_ATTEMPT_PENALTY,
} from './dictation'

interface DictationProps {
  sentence: DictationSentence
  /** Every check: each wrong attempt and the final right one count as answers in the lesson stats. */
  onAttempt: (correct: boolean) => void
  /** The learner chose to read the text: counts as one mistake. */
  onTextShown: () => void
  onDone: () => void
}

/** Listen to a sentence and write it. Wrong words are marked and the learner tries again until it is right. */
export function Dictation({ sentence, onAttempt, onTextShown, onDone }: DictationProps) {
  const { t } = useTranslation(['lesson', 'common'])
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(0)
  const [shown, setShown] = useState(false)
  const [result, setResult] = useState<DictationComparison | null>(null)
  const [done, setDone] = useState(false)

  function check(event: FormEvent) {
    event.preventDefault()
    if (!value.trim() || done) return
    const comparison = compareDictation(sentence.en, value)
    onAttempt(comparison.correct)
    if (comparison.correct) {
      playCorrect()
      setDone(true)
    } else {
      playWrong()
      setWrong((n) => n + 1)
    }
    setResult(comparison)
  }

  function showText() {
    setShown(true)
    onTextShown()
  }

  const dock = useDock<HTMLDivElement>(done)

  if (done) {
    const score = dictationScore(wrong, shown)
    return (
      <div ref={dock} className="quiz-feedback quiz-dock is-right" role="status">
        <p className="ok">
          <strong>{t('quiz.right')}</strong>
        </p>
        <SentenceFeedback en={sentence.en} it={sentence.it} />
        <p className="dictation-score">
          <Trans t={t} i18nKey="dictation.score" values={{ score }} components={{ strong: <strong /> }} />
          {(wrong > 0 || shown) && (
            <span className="muted">
              {' '}
              ({[wrong > 0 && t('dictation.wrongAttempts', { count: wrong }), shown && t('dictation.textShown')]
                .filter(Boolean)
                .join(', ')})
            </span>
          )}
        </p>
        <button type="button" onClick={onDone}>
          {t('common:actions.next')}
        </button>
      </div>
    )
  }

  return (
    <form className="stack dictation" onSubmit={check}>
      <ListenButton text={sentence.en} className="secondary" label={t('dictation.listen')} />
      <label htmlFor="dictation-input" className="visually-hidden">
        {t('dictation.write')}
      </label>
      <textarea
        id="dictation-input"
        lang="en"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) check(e)
        }}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={t('dictation.write')}
      />
      <button type="submit" disabled={!value.trim()}>
        {t('dictation.check')}
      </button>

      {result && !result.correct && (
        <div className="quiz-feedback is-wrong" role="status">
          <p className="dictation-attempt" lang="en">
            {result.words.map((w, i) => (
              <span key={i} className={w.ok ? 'word-ok' : 'word-wrong'}>
                {w.word}
                {!w.ok && <span className="visually-hidden">{t('dictation.wrongWord')}</span>}{' '}
              </span>
            ))}
          </p>
          <p className="error">
            <strong>{t('dictation.notYet')}</strong>
            {result.missing > 0 && t('dictation.missing', { count: result.missing })}
            {t('dictation.tryAgain')}
          </p>
        </div>
      )}

      {shown && <SentenceFeedback en={sentence.en} it={sentence.it} />}
      {wrong > 0 && !shown && (
        <button type="button" className="link" onClick={showText}>
          {t('dictation.showText', { points: TEXT_SHOWN_PENALTY })}
        </button>
      )}
      <p className="muted dictation-rules">
        {t('dictation.penalty', { points: WRONG_ATTEMPT_PENALTY })}
      </p>
    </form>
  )
}
