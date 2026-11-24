import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Grade } from 'ts-fsrs'
import { formatInterval, previewDue } from '../../lib/fsrs'
import { StudyPrompts } from '../study/StudyPrompts'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyActivity } from '../study/useStudyTimer'
import { endReviewSession, fetchDueItems, gradeItem, GRADES, startReviewSession, type ReviewItem } from './api'

// Cards graded "Again" come back in the same sitting once they are due again (minutes away).
const REQUEUE_WITHIN_MS = 30 * 60_000

export function ReviewPage({ onExit, onSwitchToOral }: { onExit: () => void; onSwitchToOral?: () => void }) {
  const queryClient = useQueryClient()
  const due = useQuery({ queryKey: ['review', 'due-items'], queryFn: () => fetchDueItems(new Date()), staleTime: 0, gcTime: 0 })

  async function exit(sessionId: Promise<string> | null, next: () => void = onExit) {
    if (sessionId) await endReviewSession(await sessionId).catch(() => undefined)
    await queryClient.invalidateQueries({ queryKey: ['review'] })
    next()
  }

  if (due.isPending || due.isError) {
    return (
      <main className="page review">
        <header className="row">
          <h1>Ripasso</h1>
          <button type="button" className="link" onClick={() => void exit(null)}>
            Chiudi
          </button>
        </header>
        {due.isPending ? <p>Caricamento…</p> : <p className="error">Impossibile caricare le carte da ripassare.</p>}
      </main>
    )
  }
  return (
    <ReviewSession
      initialItems={due.data}
      onExit={(id) => void exit(id)}
      onSwitchToOral={onSwitchToOral ? (id) => void exit(id, onSwitchToOral) : undefined}
    />
  )
}

interface ReviewSessionProps {
  initialItems: ReviewItem[]
  onExit: (sessionId: Promise<string> | null) => void
  onSwitchToOral?: (sessionId: Promise<string> | null) => void
}

function ReviewSession({ initialItems, onExit, onSwitchToOral }: ReviewSessionProps) {
  useStudyActivity('written')
  const [queue, setQueue] = useState(initialItems)
  // Time the answer was shown: the interval labels and the saved grade both use it, so the
  // fuzzed intervals stay put while the timer re-renders the page and match what gets stored.
  const [revealedAt, setRevealedAt] = useState<Date | null>(null)
  const [done, setDone] = useState(0)
  const sessionId = useRef<Promise<string> | null>(null)
  const current = queue[0]

  const grade = useMutation({
    mutationFn: async ({ item, value, at }: { item: ReviewItem; value: Grade; at: Date }) => {
      sessionId.current ??= startReviewSession()
      await sessionId.current
      return gradeItem(item, value, at)
    },
    onSuccess: (updated) => {
      setDone((n) => n + 1)
      setRevealedAt(null)
      setQueue((prev) => {
        const rest = prev.slice(1)
        const comesBackSoon = new Date(updated.due).getTime() - Date.now() < REQUEUE_WITHIN_MS
        return comesBackSoon ? [...rest, updated] : rest
      })
    },
  })

  return (
    <main className="page review">
      <header className="row">
        <h1>Ripasso</h1>
        <button type="button" className="link" onClick={() => onExit(sessionId.current)}>
          {current ? 'Esci' : 'Chiudi'}
        </button>
      </header>

      <StudyTimerBar />
      <StudyPrompts
        onSwitchToOral={onSwitchToOral ? () => onSwitchToOral(sessionId.current) : undefined}
        onExit={() => onExit(sessionId.current)}
      />

      {!current && (
        <section className="notice">
          {done === 0 ? (
            <p>Non hai carte da ripassare adesso. Le parole e gli errori dei dialoghi arriveranno qui.</p>
          ) : (
            <p>Ripasso finito: {done} risposte. Le prossime carte torneranno quando è il momento giusto.</p>
          )}
        </section>
      )}

      {current && (
        <>
          <p className="muted">Ancora da ripassare: {queue.length}</p>
          <article className="flashcard">
            <CardFront item={current} />
            {revealedAt ? (
              <CardBack item={current} />
            ) : (
              <button type="button" onClick={() => setRevealedAt(new Date())}>
                Mostra risposta
              </button>
            )}
          </article>

          {revealedAt && (
            <GradeButtons
              item={current}
              now={revealedAt}
              disabled={grade.isPending}
              onGrade={(value) => grade.mutate({ item: current, value, at: revealedAt })}
            />
          )}
          {grade.isError && <p className="error">Salvataggio non riuscito, riprova.</p>}
        </>
      )}
    </main>
  )
}

function CardFront({ item }: { item: ReviewItem }) {
  if (item.kind === 'vocab') {
    return (
      <>
        <p className="muted">Come si dice in italiano?</p>
        <p className="card-main" lang="en">{item.en}</p>
      </>
    )
  }
  return (
    <>
      <p className="muted">Questa frase ha un errore. Come si corregge?</p>
      <p className="card-main" lang="en">{item.original}</p>
    </>
  )
}

function CardBack({ item }: { item: ReviewItem }) {
  if (item.kind === 'vocab') return <p className="card-answer">{item.it}</p>
  return (
    <>
      <p className="card-answer" lang="en">{item.corrected}</p>
      <p className="muted">{item.explanation_it}</p>
    </>
  )
}

// "Good" is the usual answer, so it is the only solid button; "Again" is flagged in the error colour.
const GRADE_STYLES = ['secondary danger', 'secondary', '', 'secondary']

interface GradeButtonsProps {
  item: ReviewItem
  now: Date
  disabled: boolean
  onGrade: (g: Grade) => void
}

function GradeButtons({ item, now, disabled, onGrade }: GradeButtonsProps) {
  const next = previewDue(item, now)
  return (
    <div className="grades">
      {GRADES.map(({ grade, label }, index) => (
        <button
          key={grade}
          type="button"
          className={GRADE_STYLES[index]}
          disabled={disabled}
          onClick={() => onGrade(grade)}
        >
          <span>{label}</span>
          <small>{formatInterval(next[grade], now)}</small>
        </button>
      ))}
    </div>
  )
}
