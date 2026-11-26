import { useStudiedLanguage } from '../languages/useLanguage'
import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { i18n } from '../../i18n'
import type { Grade } from 'ts-fsrs'
import { Emoji } from '../../components/Emoji'
import { ListenButton } from '../../components/ListenButton'
import { canRecord, MAX_RECORDING_MS, stopSpeaking, unlockSpeech } from '../../lib/audio'
import { playCorrect, playWrong } from '../../lib/sounds'
import { useVoiceRecorder } from '../../lib/useVoiceRecorder'
import { VolumeMeter } from '../../components/VolumeMeter'
import { transcribeWithPronunciation } from '../dialogue/api'
import { PronunciationNote } from '../dialogue/PronunciationNote'
import type { Pronunciation } from '../dialogue/types'
import { compareDictation, type TypedWord } from '../lesson/dictation'
import { checkAnswer, type ReviewItem } from './api'
import { gradeAnswer, gradePronunciation, matchTranslation, MAX_ATTEMPTS } from './grading'

type VocabItem = Extract<ReviewItem, { kind: 'vocab' }>
type MistakeItem = Extract<ReviewItem, { kind: 'mistake' }>

interface CardProps<T> {
  item: T
  /** The app's grade for the answer: called once, when the card is finished. */
  onGraded: (grade: Grade) => void
}

/** Shared state of the typed/spoken cards: attempts, the AI check and the final outcome. */
function useAnswerFlow(kind: 'vocab' | 'sentence', onGraded: (grade: Grade) => void) {
  const [shownAt] = useState(() => Date.now())
  const [wrong, setWrong] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<{ correct: boolean; note: string | null } | null>(null)
  const check = useMutation({ mutationFn: checkAnswer })

  function finish(correct: boolean, exact: boolean, note: string | null, wrongAttempts = wrong) {
    if (correct) playCorrect()
    else playWrong()
    setOutcome({ correct, note })
    setHint(null)
    const seconds = (Date.now() - shownAt) / 1000
    onGraded(gradeAnswer({ wrongAttempts, correct, exact, seconds, kind }))
  }

  function miss(note: string) {
    const attempts = wrong + 1
    setWrong(attempts)
    if (attempts >= MAX_ATTEMPTS) {
      finish(false, false, note, attempts)
      return
    }
    playWrong()
    setHint(note)
  }

  return { wrong, hint, outcome, check, finish, miss, giveUp: () => finish(false, false, null) }
}

function AttemptsLeft({ wrong }: { wrong: number }) {
  const { t } = useTranslation('review')
  const left = MAX_ATTEMPTS - wrong
  return (
    <span className="muted">
      {' '}
      {left === 1 ? t('attemptsLast') : t('attemptsLeft', { count: left })}
    </span>
  )
}

/** English word -> the learner writes the Italian. Checked locally, then by the AI when it differs (synonyms). */
export function VocabCard({ item, onGraded }: CardProps<VocabItem>) {
  const lang = useStudiedLanguage()
  const { t } = useTranslation(['review', 'common'])
  const [value, setValue] = useState('')
  const flow = useAnswerFlow('vocab', onGraded)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const answer = value.trim()
    if (!answer || flow.outcome || flow.check.isPending) return
    const match = matchTranslation(item.it, answer)
    if (match === 'exact') return flow.finish(true, true, null)
    if (match === 'typo') return flow.finish(true, false, i18n.t('spelling', { ns: 'review', word: item.it }))
    try {
      const result = await flow.check.mutateAsync({ kind: 'translation', prompt: item.en, expected: item.it, answer })
      if (result.correct) flow.finish(true, false, result.feedback)
      else flow.miss(result.feedback)
    } catch {
      // The error is shown from the mutation state; the attempt does not count.
    }
  }

  return (
    <>
      <article className="flashcard">
        <p className="muted">{t('vocab.prompt')}</p>
        <div className="card-word">
          <p className="card-main" lang={lang}>
            {item.en}
          </p>
          <ListenButton text={item.en} className="listen-button" iconSize="1.4em" />
        </div>
        {flow.outcome && <p className="card-answer">{item.it}</p>}
      </article>

      {flow.outcome ? (
        <Outcome correct={flow.outcome.correct} note={flow.outcome.note} />
      ) : (
        <form className="stack review-answer" onSubmit={(e) => void submit(e)}>
          <label htmlFor="review-translation" className="visually-hidden">
            {t('vocab.label')}
          </label>
          <input
            id="review-translation"
            lang="it"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            placeholder={t('vocab.placeholder')}
            disabled={flow.check.isPending}
          />
          <button type="submit" disabled={!value.trim() || flow.check.isPending}>
            {flow.check.isPending ? t('checking') : t('check')}
          </button>
          {flow.hint && (
            <p className="error" role="status">
              <strong>{t('notRight')}</strong> {flow.hint}
              <AttemptsLeft wrong={flow.wrong} />
            </p>
          )}
          {flow.check.isError && <p className="error">{flow.check.error.message} {t('common:actions.retry')}.</p>}
          <button type="button" className="link" onClick={flow.giveUp} disabled={flow.check.isPending}>
            {t('dontKnow')}
          </button>
        </form>
      )}
    </>
  )
}

/** A sentence with a mistake -> the learner writes or says it corrected. */
export function SentenceCard({ item, onGraded }: CardProps<MistakeItem>) {
  const lang = useStudiedLanguage()
  const { t } = useTranslation(['review', 'common'])
  const [value, setValue] = useState('')
  const [attempt, setAttempt] = useState<TypedWord[] | null>(null)
  const [heard, setHeard] = useState<{ text: string; pronunciation: Pronunciation | null } | null>(null)
  const flow = useAnswerFlow('sentence', onGraded)
  const voice = canRecord()

  async function evaluate(answer: string, spoken: boolean) {
    const comparison = compareDictation(item.corrected, answer)
    if (comparison.correct) return flow.finish(true, true, null)
    try {
      const result = await flow.check.mutateAsync({
        kind: 'correction',
        prompt: item.original,
        expected: item.corrected,
        answer,
        spoken,
      })
      if (result.correct) {
        flow.finish(true, false, result.feedback)
      } else {
        setAttempt(comparison.words)
        flow.miss(result.feedback)
      }
    } catch {
      // Shown from the mutation state; the attempt does not count.
    }
  }

  const transcribe = useMutation({
    mutationFn: (audio: Blob) => transcribeWithPronunciation(audio, item.corrected, false, 'review'),
    onSuccess: (result) => {
      setHeard(result)
      void evaluate(result.text, true)
    },
  })
  const recorder = useVoiceRecorder({ onRecorded: (audio) => transcribe.mutate(audio) })

  async function toggleRecording() {
    if (recorder.isRecording) {
      await recorder.stop()
      return
    }
    unlockSpeech()
    stopSpeaking()
    transcribe.reset()
    setHeard(null)
    await recorder.start()
  }

  const busy = flow.check.isPending || transcribe.isPending

  function submit(event: FormEvent) {
    event.preventDefault()
    const answer = value.trim()
    if (!answer || flow.outcome || busy) return
    setHeard(null)
    void evaluate(answer, false)
  }

  return (
    <>
      <article className="flashcard">
        <p className="muted">{t('sentence.prompt')}</p>
        <div className="card-word">
          <p className="card-main card-sentence" lang={lang}>
            {item.original}
          </p>
          <ListenButton text={item.original} className="listen-button" iconSize="1.4em" />
        </div>
        {flow.outcome && (
          <>
            <div className="card-word">
              <p className="card-answer" lang={lang}>
                {item.corrected}
              </p>
              <ListenButton text={item.corrected} className="listen-button" iconSize="1.4em" />
            </div>
            <p className="muted">{item.explanation_it}</p>
          </>
        )}
      </article>

      {heard && (
        <div className="review-heard">
          <p className="muted">
            <Trans t={t} i18nKey="common:voice.heard" values={{ text: heard.text }} components={{ en: <span lang={lang} /> }} />
          </p>
          {heard.pronunciation && <PronunciationNote pronunciation={heard.pronunciation} />}
        </div>
      )}

      {flow.outcome ? (
        <Outcome correct={flow.outcome.correct} note={flow.outcome.note} />
      ) : (
        <form className="stack review-answer" onSubmit={submit}>
          <label htmlFor="review-sentence" className="visually-hidden">
            {t('sentence.label')}
          </label>
          <textarea
            id="review-sentence"
            lang={lang}
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e)
            }}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t('sentence.placeholder')}
            disabled={busy || recorder.isRecording}
          />
          <div className="row review-actions">
            <button type="submit" disabled={!value.trim() || busy || recorder.isRecording}>
              {flow.check.isPending ? t('checking') : t('check')}
            </button>
            {voice && (
              <button
                type="button"
                className={`secondary${recorder.isRecording ? ' recording' : ''}`}
                onClick={() => void toggleRecording()}
                disabled={busy && !recorder.isRecording}
                aria-pressed={recorder.isRecording}
              >
                {recorder.isRecording ? (
                  t('common:voice.stop', { seconds: recorder.seconds, limit: MAX_RECORDING_MS / 1000 })
                ) : transcribe.isPending ? (
                  t('sentence.listening')
                ) : (
                  <>
                    <Emoji name="microphone" /> {t('sayIt')}
                  </>
                )}
              </button>
            )}
          </div>
          {recorder.isRecording && <VolumeMeter level={recorder.level} autoStops={recorder.autoStops} />}
          {recorder.micError && <p className="error">{recorder.micError}</p>}
          {transcribe.isError && <p className="error">{transcribe.error.message}</p>}
          {flow.hint && (
            <div className="quiz-feedback is-wrong" role="status">
              {attempt && (
                <p className="dictation-attempt" lang={lang}>
                  {attempt.map((w, i) => (
                    <span key={i} className={w.ok ? 'word-ok' : 'word-wrong'}>
                      {w.word}
                      {!w.ok && <span className="visually-hidden">{t('sentence.different')}</span>}{' '}
                    </span>
                  ))}
                </p>
              )}
              <p className="error">
                <strong>{t('notRight')}</strong> {flow.hint}
                <AttemptsLeft wrong={flow.wrong} />
              </p>
            </div>
          )}
          {flow.check.isError && <p className="error">{flow.check.error.message} {t('common:actions.retry')}.</p>}
          <button type="button" className="link" onClick={flow.giveUp} disabled={busy}>
            {t('dontKnow')}
          </button>
        </form>
      )}
    </>
  )
}

/** A mispronounced word -> the learner listens and says it; the pronunciation score is the grade. */
export function PronunciationCard({ item, onGraded, onSkip }: CardProps<MistakeItem> & { onSkip: () => void }) {
  const lang = useStudiedLanguage()
  const { t } = useTranslation(['review', 'common'])
  const [result, setResult] = useState<{ text: string; pronunciation: Pronunciation } | null>(null)
  const [unclear, setUnclear] = useState<string | null>(null)
  const voice = canRecord()

  const assess = useMutation({
    mutationFn: (audio: Blob) => transcribeWithPronunciation(audio, item.corrected, false, 'review'),
    onSuccess: ({ text, pronunciation }) => {
      if (!pronunciation) {
        setUnclear(text)
        return
      }
      const grade = gradePronunciation(pronunciation.score)
      if (pronunciation.score >= 75) playCorrect()
      else playWrong()
      setResult({ text, pronunciation })
      onGraded(grade)
    },
  })
  const recorder = useVoiceRecorder({ onRecorded: (audio) => assess.mutate(audio) })

  async function toggleRecording() {
    if (recorder.isRecording) {
      await recorder.stop()
      return
    }
    unlockSpeech()
    stopSpeaking()
    assess.reset()
    setUnclear(null)
    await recorder.start()
  }

  return (
    <>
      <article className="flashcard">
        <p className="muted">{t('pron.prompt')}</p>
        <div className="card-word">
          <p className="card-main" lang={lang}>
            {item.original}
          </p>
          <ListenButton text={item.original} className="listen-button" iconSize="1.4em" />
        </div>
        <p className="muted">{item.explanation_it}</p>
      </article>

      {result ? (
        <div className="review-heard">
          <p className="muted">
            <Trans t={t} i18nKey="common:voice.heard" values={{ text: result.text }} components={{ en: <span lang={lang} /> }} />
          </p>
          <PronunciationNote pronunciation={result.pronunciation} />
        </div>
      ) : (
        <div className="stack review-answer">
          {voice ? (
            <button
              type="button"
              className={recorder.isRecording ? 'recording' : undefined}
              onClick={() => void toggleRecording()}
              disabled={assess.isPending}
              aria-pressed={recorder.isRecording}
            >
              {recorder.isRecording ? (
                t('common:voice.stop', { seconds: recorder.seconds, limit: MAX_RECORDING_MS / 1000 })
              ) : assess.isPending ? (
                t('pron.assessing')
              ) : (
                <>
                  <Emoji name="microphone" /> {t('sayIt')}
                </>
              )}
            </button>
          ) : (
            <p className="muted">{t('pron.noMic')}</p>
          )}
          {recorder.isRecording && <VolumeMeter level={recorder.level} autoStops={recorder.autoStops} />}
          {unclear !== null && (
            <p className="error">
              {unclear ? t('pron.unclearHeard', { text: unclear }) : t('pron.unclear')}
            </p>
          )}
          {recorder.micError && <p className="error">{recorder.micError}</p>}
          {assess.isError && <p className="error">{assess.error.message}</p>}
          {(!voice || recorder.micError || assess.isError) && (
            <button type="button" className="link" onClick={onSkip}>
              {t('pron.skip')}
            </button>
          )}
        </div>
      )}
    </>
  )
}

function Outcome({ correct, note }: { correct: boolean; note: string | null }) {
  const { t } = useTranslation('review')
  return (
    <div className={`quiz-feedback ${correct ? 'is-right' : 'is-wrong'}`} role="status">
      <p className={correct ? 'ok' : 'error'}>
        <strong>{correct ? t('outcome.right') : t('outcome.wrong')}</strong>
      </p>
      {note && <p>{note}</p>}
    </div>
  )
}
