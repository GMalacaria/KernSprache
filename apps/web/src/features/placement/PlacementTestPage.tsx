import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { canRecord } from '../../lib/audio'
import { skipPlacement, startPlacement, submitPlacement, type PlacementResult } from './api'
import { SpokenAnswer } from './SpokenAnswer'

interface PlacementTestPageProps {
  userId: string
  /** First run: the test can be skipped (start from A1). */
  firstRun: boolean
  onDone: () => void
}

type Step = { kind: 'intro' } | { kind: 'written'; index: number } | { kind: 'oral'; index: number } | { kind: 'result' }

export function PlacementTestPage({ userId, firstRun, onDone }: PlacementTestPageProps) {
  const queryClient = useQueryClient()
  const test = useQuery({ queryKey: ['placement', 'questions'], queryFn: startPlacement, staleTime: Infinity })
  const [step, setStep] = useState<Step>({ kind: 'intro' })
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [oral, setOral] = useState<{ id: string; transcript: string }[]>([])
  const voice = canRecord()

  const finish = async () => {
    await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    onDone()
  }

  const submit = useMutation({
    mutationFn: (transcripts: { id: string; transcript: string }[]) => submitPlacement(answers, transcripts),
    onSuccess: () => setStep({ kind: 'result' }),
  })

  const skip = useMutation({ mutationFn: () => skipPlacement(userId), onSuccess: finish })

  if (test.isPending) return <Shell>Carico il test…</Shell>
  if (test.isError) return <Shell error>{test.error.message}</Shell>
  const { questions, oral_prompts: prompts } = test.data

  function nextAfterWritten(index: number) {
    if (index + 1 < questions.length) setStep({ kind: 'written', index: index + 1 })
    else if (voice) setStep({ kind: 'oral', index: 0 })
    else submit.mutate([])
  }

  function nextAfterOral(index: number, transcripts: { id: string; transcript: string }[]) {
    if (index + 1 < prompts.length) setStep({ kind: 'oral', index: index + 1 })
    else submit.mutate(transcripts)
  }

  if (step.kind === 'intro') {
    return (
      <main className="page">
        <h1>Test di livello</h1>
        <p>
          Circa 10 minuti per capire da dove partire: {questions.length} domande scritte a scelta multipla e{' '}
          {voice ? `${prompts.length} risposte a voce` : 'nessuna risposta a voce (microfono non disponibile)'}.
        </p>
        <p className="muted">Se non conosci una risposta, scegli "Non lo so": il test serve solo a darti lezioni adatte.</p>
        <div className="stack">
          <button type="button" onClick={() => setStep({ kind: 'written', index: 0 })}>
            Inizia il test
          </button>
          {firstRun ? (
            <button type="button" className="link" onClick={() => skip.mutate()} disabled={skip.isPending}>
              Salta, parto dal livello A1
            </button>
          ) : (
            <button type="button" className="link" onClick={onDone}>
              Annulla
            </button>
          )}
          {skip.isError && <p className="error">Non sono riuscito a salvare. Riprova.</p>}
        </div>
      </main>
    )
  }

  if (submit.isPending) return <Shell>Calcolo il tuo livello…</Shell>
  if (submit.isError) {
    return (
      <Shell error>
        {submit.error.message}{' '}
        <button type="button" className="link" onClick={() => submit.mutate(oral)}>
          Riprova
        </button>
      </Shell>
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
        <Progress label="Parte scritta" current={step.index + 1} total={questions.length} />
        <p className="muted">Scegli la parola giusta:</p>
        <p className="card-main question" lang="en">
          {q.prompt}
        </p>
        <div className="stack options">
          {q.options.map((option, i) => (
            <button key={option} type="button" className="option" lang="en" onClick={() => choose(i)}>
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
    const p = prompts[step.index]
    if (!p) return null
    return (
      <main className="page">
        <Progress label="Parte orale" current={step.index + 1} total={prompts.length} />
        <p className="muted">Rispondi in inglese, con qualche frase:</p>
        <p className="card-main question">{p.prompt_it}</p>
        <SpokenAnswer
          key={p.id}
          onDone={(transcript) => {
            const next = [...oral, { id: p.id, transcript }]
            setOral(next)
            nextAfterOral(step.index, next)
          }}
          onSkip={() => nextAfterOral(step.index, oral)}
        />
      </main>
    )
  }

  return <ResultView result={submit.data} onContinue={() => void finish()} />
}

function ResultView({ result, onContinue }: { result: PlacementResult | undefined; onContinue: () => void }) {
  if (!result) return null
  return (
    <main className="page">
      <h1>Il tuo livello</h1>
      <p className="level-badge">{result.final_level}</p>
      <p>
        Scritto: {result.written.correct} risposte giuste su {result.written.total} (livello {result.written.level})
        {result.oral && ` · Orale: livello ${result.oral.level}`}
      </p>
      {result.oral && (
        <section className="notice">
          <p>{result.oral.feedback_it}</p>
          {result.oral.strengths_it.length > 0 && (
            <>
              <h2 className="small-heading">Punti di forza</h2>
              <ul>
                {result.oral.strengths_it.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {result.oral.to_improve_it.length > 0 && (
            <>
              <h2 className="small-heading">Da migliorare</h2>
              <ul>
                {result.oral.to_improve_it.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      <p className="muted">Le lezioni partiranno da questo livello. Puoi rifare il test quando vuoi dalla home.</p>
      <button type="button" onClick={onContinue}>
        Continua
      </button>
    </main>
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

function Shell({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <main className="page">
      <h1>Test di livello</h1>
      <p className={error ? 'error' : undefined}>{children}</p>
    </main>
  )
}
