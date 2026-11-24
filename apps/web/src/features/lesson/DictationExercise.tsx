import { useState, type FormEvent } from 'react'
import { Emoji } from '../../components/Emoji'
import { SentenceFeedback } from '../../components/SentenceFeedback'
import { canSpeak, speak } from '../../lib/audio'
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

  if (done) {
    const score = dictationScore(wrong, shown)
    return (
      <div className="quiz-feedback is-right" role="status">
        <p className="ok">
          <strong>Giusto!</strong>
        </p>
        <SentenceFeedback en={sentence.en} it={sentence.it} />
        <p className="dictation-score">
          Punteggio della frase: <strong>{score}/100</strong>
          {(wrong > 0 || shown) && (
            <span className="muted">
              {' '}
              ({[wrong > 0 && `${wrong} ${wrong === 1 ? 'tentativo sbagliato' : 'tentativi sbagliati'}`, shown && 'testo mostrato']
                .filter(Boolean)
                .join(', ')})
            </span>
          )}
        </p>
        <button type="button" onClick={onDone}>
          Avanti
        </button>
      </div>
    )
  }

  return (
    <form className="stack dictation" onSubmit={check}>
      {canSpeak() && (
        <button type="button" className="secondary" onClick={() => speak(sentence.en)}>
          <Emoji name="speaker" /> Ascolta la frase
        </button>
      )}
      <label htmlFor="dictation-input" className="visually-hidden">
        Scrivi quello che hai sentito
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
        placeholder="Scrivi quello che hai sentito"
      />
      <button type="submit" disabled={!value.trim()}>
        Controlla
      </button>

      {result && !result.correct && (
        <div className="quiz-feedback is-wrong" role="status">
          <p className="dictation-attempt" lang="en">
            {result.words.map((w, i) => (
              <span key={i} className={w.ok ? 'word-ok' : 'word-wrong'}>
                {w.word}
                {!w.ok && <span className="visually-hidden"> (sbagliata)</span>}{' '}
              </span>
            ))}
          </p>
          <p className="error">
            <strong>Non ancora: le parole sottolineate non coincidono.</strong>
            {result.missing > 0 && ` Mancano ${result.missing} ${result.missing === 1 ? 'parola' : 'parole'}.`} Riascolta e riprova.
          </p>
        </div>
      )}

      {shown && <SentenceFeedback en={sentence.en} it={sentence.it} />}
      {wrong > 0 && !shown && (
        <button type="button" className="link" onClick={showText}>
          Mostra il testo (−{TEXT_SHOWN_PENALTY} punti)
        </button>
      )}
      <p className="muted dictation-rules">
        Ogni tentativo sbagliato toglie {WRONG_ATTEMPT_PENALTY} punti alla frase.
      </p>
    </form>
  )
}
