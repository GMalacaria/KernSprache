import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { NoMicrophone } from '../../components/NoMicrophone'
import { SentenceFeedback } from '../../components/SentenceFeedback'
import { canRecord } from '../../lib/audio'
import { useProfile } from '../home/useProfile'
import { prefetchChapter } from '../lesson/api'
import { ChapterStats, StatsGrid } from '../lesson/ChapterStats'
import { addAnswer, EMPTY_TALLY } from '../lesson/quiz'
import { summarizeStats } from '../lesson/stats'
import { SpokenAnswer } from '../placement/SpokenAnswer'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyActivity } from '../study/useStudyTimer'
import { type ChapterTest, type ChapterTestResult, startChapterTest, submitChapterTest } from './api'
import { BackHeader } from '../../components/BackHeader'
import { Waiting } from '../../components/Waiting'

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
  const { t } = useTranslation(['tests', 'common'])
  const queryClient = useQueryClient()
  // The oral half is required: without a microphone the test does not start (and is not generated).
  const voice = canRecord()
  // A new attempt (after a failed one) asks the server for a fresh test.
  const [attempt, setAttempt] = useState(0)
  const test = useQuery({
    queryKey: ['chapter-test', chapterId, attempt],
    queryFn: () => startChapterTest(chapterId),
    enabled: voice,
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
  // Written half first, then the oral half: the study timer counts each in its own half of the day.
  useStudyActivity(step.kind === 'oral' ? 'oral' : 'written')

  const submit = useMutation({
    mutationFn: (transcripts: Transcript[]) => submitChapterTest((test.data as ChapterTest).test_id, answers, transcripts),
    onSuccess: (result) => {
      setStep({ kind: 'result' })
      void queryClient.invalidateQueries({ queryKey: ['passed-chapters'] })
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      void queryClient.invalidateQueries({ queryKey: ['chapter-stats', chapterId] })
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

  if (!voice) {
    return (
      <Shell onExit={onExit}>
        <NoMicrophone
          title={t('chapter.noMic.title')}
          why={t('chapter.noMic.why')}
        />
      </Shell>
    )
  }
  if (test.isPending) {
    return (
      <Shell onExit={onExit}>
        <Waiting
          title={t('chapter.preparing.title')}
          hints={[t('chapter.preparing.hint1'), t('chapter.preparing.hint2')]}
        />
      </Shell>
    )
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

  if (submit.isPending) {
    return (
      <Shell onExit={onExit}>
        <Waiting
          title={t('chapter.grading.title')}
          hints={[t('chapter.grading.hint1'), t('chapter.grading.hint2'), t('chapter.grading.hint3')]}
        />
      </Shell>
    )
  }
  if (submit.isError) {
    return (
      <Shell onExit={onExit} error>
        {submit.error.message}{' '}
        <button type="button" className="link" onClick={() => submit.mutate(oral)}>
          {t('common:actions.retry')}
        </button>
      </Shell>
    )
  }

  if (step.kind === 'intro') {
    return (
      <main className="page">
        <BackHeader title={t('chapter.title')} onBack={onExit} />
        <p>
          <Trans
            t={t}
            i18nKey="chapter.intro"
            values={{ title: chapterTitle, questions: questions.length, tasks: tasks.length }}
            components={{ strong: <strong /> }}
          />
        </p>
        <p className="muted">
          {skipAhead ? t('chapter.skipAhead') : t('chapter.normal')} {t('chapter.answersAtEnd')}
        </p>
        <button type="button" onClick={() => setStep({ kind: 'written', index: 0 })}>
          {t('chapter.start')}
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
        <Progress label={t('writtenPart')} current={step.index + 1} total={questions.length} />
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
            {t('dontKnow')}
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
        <Progress label={t('oralPart')} current={step.index + 1} total={tasks.length} />
        <p className="muted">{t('chapter.oralPrompt')}</p>
        <p className="card-main question">{task.prompt}</p>
        <SpokenAnswer key={task.id} onDone={done} onSkip={() => nextAfterOral(step.index, oral)} />
      </main>
    )
  }

  const result = submit.data
  if (!result) return null
  return (
    <ResultView
      result={result}
      test={test.data}
      chapterId={chapterId}
      levelBefore={levelBefore}
      onRetry={retry}
      onExit={onExit}
    />
  )
}

interface ResultViewProps {
  result: ChapterTestResult
  test: ChapterTest
  chapterId: number
  levelBefore: string | undefined
  onRetry: () => void
  onExit: () => void
}

function ResultView({ result, test, chapterId, levelBefore, onRetry, onExit }: ResultViewProps) {
  const { t } = useTranslation('tests')
  const { written, oral } = result
  // The written half in the same numbers as the lessons, in question order.
  const tally = test.questions.reduce((tally, q) => addAnswer(tally, !written.wrong.some((w) => w.id === q.id)), EMPTY_TALLY)
  const testSummary = summarizeStats([
    { lesson_id: 0, answers: tally.answered, correct: tally.correct, best_streak: tally.bestStreak },
  ])
  return (
    <main className="page">
      <h1>{result.passed ? t('chapter.passed') : t('chapter.notYet')}</h1>
      <p className="level-badge">{result.score}/100</p>
      <p>
        {t('chapter.scores', { correct: written.correct, total: written.total, written: written.score, oral: oral.score })}
      </p>
      {result.passed ? (
        <p className="notice">
          {t('chapter.passedNotice')}
          {result.level &&
            levelBefore &&
            result.level !== levelBefore &&
            t('chapter.levelUp', { from: levelBefore, to: result.level })}
        </p>
      ) : (
        <p className="notice">{t('chapter.failedNotice')}</p>
      )}

      <section className="notice">
        <p>{oral.feedback}</p>
        <FeedbackList title={t('strengths')} items={oral.strengths} />
        <FeedbackList title={t('toImprove')} items={oral.to_improve} />
      </section>

      <section>
        <h2 className="small-heading">{t('chapter.writtenHalf')}</h2>
        <StatsGrid summary={testSummary} />
      </section>
      <ChapterStats chapterId={chapterId} />

      <section>
        <h2 className="small-heading">{t('chapter.reviewQuestions')}</h2>
        <ul className="review-list">
          {test.questions.map((q) => {
            const wrong = written.wrong.find((w) => w.id === q.id)
            const review = result.review.find((r) => r.id === q.id)
            return (
              <li key={q.id}>
                <p lang="en" className="review-answer">
                  {q.prompt}
                </p>
                <p className="review-answer">
                  {wrong ? (
                    <span className="error">
                      {wrong.chosen === null
                        ? t('chapter.unanswered')
                        : t('chapter.chose', { option: q.options[wrong.chosen] })}
                      {t('chapter.rightWas', { option: q.options[wrong.answer] })}
                    </span>
                  ) : (
                    <span className="ok">{t('chapter.right')}</span>
                  )}
                </p>
                {review && <SentenceFeedback text={review.sentence} translation={review.translation} />}
              </li>
            )
          })}
        </ul>
      </section>

      <div className="stack">
        <button type="button" onClick={onExit}>
          {result.passed ? t('chapter.backToPath') : t('chapter.reviewLessons')}
        </button>
        {!result.passed && (
          <button type="button" className="link" onClick={onRetry}>
            {t('chapter.retryNew')}
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

function Shell({ children, error = false, onExit }: { children: ReactNode; error?: boolean; onExit: () => void }) {
  const { t } = useTranslation('tests')
  return (
    <main className="page">
      <BackHeader title={t('chapter.title')} onBack={onExit} />
      <div className={error ? 'error' : undefined}>{children}</div>
    </main>
  )
}
