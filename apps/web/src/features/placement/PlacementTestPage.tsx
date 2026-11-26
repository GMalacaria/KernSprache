import { useLanguageNames } from '../languages/useLanguage'
import { useStudiedLanguage } from '../languages/useLanguage'
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { canRecord } from '../../lib/audio'
import { skipPlacement, startPlacement, submitPlacement, type PlacementResult } from './api'
import { SpokenAnswer } from './SpokenAnswer'
import { BackHeader } from '../../components/BackHeader'
import { Waiting } from '../../components/Waiting'
import { useTranslation } from 'react-i18next'

interface PlacementTestPageProps {
  userId: string
  /** First run: the test can be skipped (start from A1). */
  firstRun: boolean
  onDone: () => void
}

type Step = { kind: 'intro' } | { kind: 'written'; index: number } | { kind: 'oral'; index: number } | { kind: 'result' }

export function PlacementTestPage({ userId, firstRun, onDone }: PlacementTestPageProps) {
  const lang = useStudiedLanguage()
  const { t } = useTranslation(['tests', 'common'])
  const names = useLanguageNames()
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
  // Retaken from the profile: a back arrow leaves at any step. The first run has no way back, only "Salta".
  const title = firstRun ? <h1>{t('placement.title')}</h1> : <BackHeader title={t('placement.title')} onBack={onDone} />

  if (test.isPending) return <Shell>{t('placement.loading')}</Shell>
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
        {title}
        <p>
          {t('placement.intro', {
            questions: questions.length,
            oral: voice ? t('placement.oralCount', { count: prompts.length }) : t('placement.noOral'),
          })}
        </p>
        <p className="muted">{t('placement.dontKnowHint')}</p>
        <div className="stack">
          <button type="button" onClick={() => setStep({ kind: 'written', index: 0 })}>
            {t('placement.start')}
          </button>
          {firstRun && (
            <button type="button" className="link" onClick={() => skip.mutate()} disabled={skip.isPending}>
              {t('placement.skip')}
            </button>
          )}
          {skip.isError && <p className="error">{t('common:errors.saveFailed')}</p>}
        </div>
      </main>
    )
  }

  if (submit.isPending) {
    return (
      <main className="page">
        <h1>{t('placement.title')}</h1>
        <Waiting
          title={t('placement.grading.title')}
          hints={[t('placement.grading.hint1'), t('placement.grading.hint2'), t('placement.grading.hint3')]}
        />
      </main>
    )
  }
  if (submit.isError) {
    return (
      <Shell error>
        {submit.error.message}{' '}
        <button type="button" className="link" onClick={() => submit.mutate(oral)}>
          {t('common:actions.retry')}
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
        {!firstRun && title}
        <Progress label={t('writtenPart')} current={step.index + 1} total={questions.length} />
        <p className="muted">{t('placement.writtenPrompt')}</p>
        <p className="card-main question" lang={lang}>
          {q.prompt}
        </p>
        <div className="stack options">
          {q.options.map((option, i) => (
            <button key={option} type="button" className="option" lang={lang} onClick={() => choose(i)}>
              {option}
            </button>
          ))}
          <button type="button" className="link" onClick={() => choose(null)}>
            {t('dontKnow')}
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
        {!firstRun && title}
        <Progress label={t('oralPart')} current={step.index + 1} total={prompts.length} />
        <p className="muted">{t('placement.oralPrompt', { language: names.lower })}</p>
        <p className="card-main question">{p.prompt}</p>
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
  const { t } = useTranslation('tests')
  if (!result) return null
  return (
    <main className="page">
      <h1>{t('placement.resultTitle')}</h1>
      <p className="level-badge">{result.final_level}</p>
      <p>
        {t('placement.writtenResult', {
          correct: result.written.correct,
          total: result.written.total,
          level: result.written.level,
        })}
        {result.oral && t('placement.oralResult', { level: result.oral.level })}
      </p>
      {result.oral && (
        <section className="notice">
          <p>{result.oral.feedback}</p>
          {result.oral.strengths.length > 0 && (
            <>
              <h2 className="small-heading">{t('strengths')}</h2>
              <ul>
                {result.oral.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {result.oral.to_improve.length > 0 && (
            <>
              <h2 className="small-heading">{t('toImprove')}</h2>
              <ul>
                {result.oral.to_improve.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      <p className="muted">{t('placement.resultHint')}</p>
      <button type="button" onClick={onContinue}>
        {t('placement.continue')}
      </button>
    </main>
  )
}

function Progress({ label, current, total }: { label: string; current: number; total: number }) {
  const { t } = useTranslation('tests')
  return (
    <div className="placement-progress">
      <small>{t('progress', { label, current, total })}</small>
      <div className="bar">
        <span style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  )
}

function Shell({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const { t } = useTranslation('tests')
  return (
    <main className="page">
      <h1>{t('placement.title')}</h1>
      <p className={error ? 'error' : undefined}>{children}</p>
    </main>
  )
}
