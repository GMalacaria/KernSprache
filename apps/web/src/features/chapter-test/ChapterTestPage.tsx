import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { canRecord } from '../../lib/audio'
import { useProfile } from '../home/useProfile'
import { prefetchChapter } from '../lesson/api'
import { SpokenAnswer } from '../placement/SpokenAnswer'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyActivity } from '../study/useStudyTimer'
import { type ChapterTest, type ChapterTestResult, startChapterTest, submitChapterTest } from './api'

interface ChapterTestPageProps {
  userId: string
  chapterId: number
  chapterTitle: string
  /** Chapter after this one: prepared in the background once this test is passed. */
  nextChapterId?: number
  /** The chapter is ahead of the path: passing it skips the chapters before it. */
  skipAhead?: boolean
  onExit: () => void
}

type Step = { kind: 'intro' } | { kind: 'written'; index: number } | { kind: 'oral'; index: number } | { kind: 'result' }
type Transcript = { id: string; transcript: string }

export function ChapterTestPage({
  userId,
  chapterId,
  chapterTitle,
  nextChapterId,
  skipAhead = false,
  onExit,
}: ChapterTestPageProps) {
  const queryClient = useQueryClient()
  // A new attempt (after a failed one) asks the server for a fresh test.
  const [attempt, setAttempt] = useState(0)
  const test = useQuery({
    queryKey: ['chapter-test', chapterId, attempt],
    queryFn: () => startChapterTest(chapterId),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const [step, setStep] = useState<Step>({ kind: 'intro' })
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [oral, setOral] = useState<Transcript[]>([])
  const profile = useProfile(userId)
  // Level when the test opened: the profile is refreshed after a pass, so a change means a level-up.
  const [levelBefore] = useState(profile.data?.level)
  const voice = canRecord()
  // Written half first, then the oral half: the study timer counts each in its own half of the day.
  useStudyActivity(step.kind === 'oral' ? 'oral' : 'written')

  const submit = useMutation({
    mutationFn: (transcripts: Transcript[]) => submitChapterTest((test.data as ChapterTest).test_id, answers, transcripts),
    onSuccess: (result) => {
      setStep({ kind: 'result' })
      void queryClient.invalidateQueries({ queryKey: ['passed-chapters'] })
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      if (result.passed && nextChapterId !== undefined) prefetchChapter(nextChapterId)
    },
  })

  function retry() {
    setAttempt((n) => n + 1)
    setStep({ kind: 'intro' })
    setAnswers({})
    setOral([])
    submit.reset()
  }

  if (test.isPending) {
    return <Shell onExit={onExit}>Preparo la verifica… (può richiedere qualche secondo)</Shell>
  }
  if (test.isError) {
    return (
      <Shell onExit={onExit} error>
        {test.error.message}
      </Shell>
    )
  }
  const { questions, oral_tasks: tasks } = test.data

  function nextAfterWritten(index: number) {
    if (index + 1 < questions.length) setStep({ kind: 'written', index: index + 1 })
    else setStep({ kind: 'oral', index: 0 })
  }

  function nextAfterOral(index: number, transcripts: Transcript[]) {
    if (index + 1 < tasks.length) setStep({ kind: 'oral', index: index + 1 })
    else submit.mutate(transcripts)
  }

  if (submit.isPending) return <Shell onExit={onExit}>Correggo la verifica…</Shell>
  if (submit.isError) {
    return (
      <Shell onExit={onExit} error>
        {submit.error.message}{' '}
        <button type="button" className="link" onClick={() => submit.mutate(oral)}>
          Riprova
        </button>
      </Shell>
    )
  }

  if (step.kind === 'intro') {
    return (
      <main className="page">
        <header className="row">
          <h1>Verifica del capitolo</h1>
          <button type="button" className="link" onClick={onExit}>
            Esci
          </button>
        </header>
        <p>
          <strong>{chapterTitle}</strong>: {questions.length} domande scritte a scelta multipla e {tasks.length} risposte{' '}
          {voice ? 'a voce' : 'scritte (microfono non disponibile)'}.
        </p>
        <p className="muted">
          {skipAhead
            ? 'Non hai ancora studiato questo capitolo: se superi la verifica con almeno 70 su 100 (media di scritto e orale) salti i capitoli che lo precedono e passi a quello dopo. '
            : 'Serve a capire se hai capito il capitolo: con almeno 70 su 100 (media di scritto e orale) passi al capitolo successivo. '}
          Le risposte giuste le vedi alla fine.
        </p>
        <button type="button" onClick={() => setStep({ kind: 'written', index: 0 })}>
          Inizia
        </button>
      </main>
    )
  }

  if (step.kind === 'written') {
    const q = questions[step.index]
    if (!q) return null
    const choose = (option: number | null) => {
      if (option !== null) setAnswers((a) => ({ ...a, [q.id]: option }))
      nextAfterWritten(step.index)
    }
    return (
      <main className="page">
        <StudyTimerBar />
        <Progress label="Parte scritta" current={step.index + 1} total={questions.length} />
        <p className="card-main question" lang="en">
          {q.prompt}
        </p>
        <div className="stack options">
          {q.options.map((option, i) => (
            <button key={`${i}-${option}`} type="button" className="option" lang="en" onClick={() => choose(i)}>
              {option}
            </button>
          ))}
          <button type="button" className="link" onClick={() => choose(null)}>
            Non lo so
          </button>
        </div>
      </main>
    )
  }

  if (step.kind === 'oral') {
    const task = tasks[step.index]
    if (!task) return null
    const done = (transcript: string) => {
      const next = [...oral, { id: task.id, transcript }]
      setOral(next)
      nextAfterOral(step.index, next)
    }
    return (
      <main className="page">
        <StudyTimerBar />
        <Progress label="Parte orale" current={step.index + 1} total={tasks.length} />
        <p className="muted">{voice ? 'Rispondi a voce in inglese, con qualche frase:' : 'Rispondi per iscritto in inglese:'}</p>
        <p className="card-main question">{task.prompt_it}</p>
        {voice ? (
          <SpokenAnswer key={task.id} onDone={done} onSkip={() => nextAfterOral(step.index, oral)} />
        ) : (
          <TypedAnswer key={task.id} onDone={done} />
        )}
      </main>
    )
  }

  const result = submit.data
  if (!result) return null
  return (
    <ResultView
      result={result}
      test={test.data}
      levelBefore={levelBefore}
      onRetry={retry}
      onExit={onExit}
    />
  )
}

function TypedAnswer({ onDone }: { onDone: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div className="stack">
      <textarea lang="en" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" disabled={text.trim().length === 0} onClick={() => onDone(text)}>
        Avanti
      </button>
    </div>
  )
}

interface ResultViewProps {
  result: ChapterTestResult
  test: ChapterTest
  levelBefore: string | undefined
  onRetry: () => void
  onExit: () => void
}

function ResultView({ result, test, levelBefore, onRetry, onExit }: ResultViewProps) {
  const { written, oral } = result
  return (
    <main className="page">
      <h1>{result.passed ? 'Capitolo superato' : 'Non ancora'}</h1>
      <p className="level-badge">{result.score}/100</p>
      <p>
        Scritto: {written.correct} giuste su {written.total} ({written.score}/100) · Orale: {oral.score}/100
      </p>
      {result.passed ? (
        <p className="notice">
          Hai superato la verifica.
          {result.level && levelBefore && result.level !== levelBefore && ` Hai finito il livello ${levelBefore}: adesso sei al ${result.level}!`}
        </p>
      ) : (
        <p className="notice">Servono almeno 70 su 100. Ripassa le lezioni del capitolo e riprova con una verifica nuova.</p>
      )}

      <section className="notice">
        <p>{oral.feedback_it}</p>
        <FeedbackList title="Punti di forza" items={oral.strengths_it} />
        <FeedbackList title="Da migliorare" items={oral.to_improve_it} />
      </section>

      {written.wrong.length > 0 && (
        <section>
          <h2 className="small-heading">Risposte sbagliate</h2>
          <ul>
            {written.wrong.map((w) => {
              const q = test.questions.find((x) => x.id === w.id)
              if (!q) return null
              return (
                <li key={w.id}>
                  <span lang="en">{q.prompt}</span>
                  <br />
                  <small>
                    {w.chosen === null ? 'Non risposta' : <>Hai scelto "{q.options[w.chosen]}"</>} · giusta: "
                    {q.options[w.answer]}"
                  </small>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="stack">
        <button type="button" onClick={onExit}>
          {result.passed ? 'Torna al percorso' : 'Ripassa le lezioni'}
        </button>
        {!result.passed && (
          <button type="button" className="link" onClick={onRetry}>
            Riprova subito con una verifica nuova
          </button>
        )}
      </div>
    </main>
  )
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <>
      <h2 className="small-heading">{title}</h2>
      <ul>
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </>
  )
}

function Progress({ label, current, total }: { label: string; current: number; total: number }) {
  return (
    <div className="placement-progress">
      <small>
        {label}: {current} di {total}
      </small>
      <div className="bar">
        <span style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  )
}

function Shell({ children, error = false, onExit }: { children: ReactNode; error?: boolean; onExit: () => void }) {
  return (
    <main className="page">
      <header className="row">
        <h1>Verifica del capitolo</h1>
        <button type="button" className="link" onClick={onExit}>
          Esci
        </button>
      </header>
      <p className={error ? 'error' : undefined}>{children}</p>
    </main>
  )
}
