import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Grade } from 'ts-fsrs'
import { formatInterval, previewDue } from '../../lib/fsrs'
import { endReviewSession, fetchDueItems, gradeItem, GRADES, startReviewSession, type ReviewItem } from './api'

// Cards graded "Again" come back in the same sitting once they are due again (minutes away).
const REQUEUE_WITHIN_MS = 30 * 60_000

export function ReviewPage({ onExit }: { onExit: () => void }) {
  const queryClient = useQueryClient()
  const due = useQuery({ queryKey: ['review', 'due-items'], queryFn: () => fetchDueItems(new Date()), staleTime: 0, gcTime: 0 })

  async function exit(sessionId: Promise<string> | null) {
    if (sessionId) await endReviewSession(await sessionId).catch(() => undefined)
    await queryClient.invalidateQueries({ queryKey: ['review'] })
    onExit()
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
  return <ReviewSession initialItems={due.data} onExit={(id) => void exit(id)} />
}

function ReviewSession({ initialItems, onExit }: { initialItems: ReviewItem[]; onExit: (sessionId: Promise<string> | null) => void }) {
  const [queue, setQueue] = useState(initialItems)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(0)
  const sessionId = useRef<Promise<string> | null>(null)
  const current = queue[0]

  const grade = useMutation({
    mutationFn: async ({ item, value }: { item: ReviewItem; value: Grade }) => {
      sessionId.current ??= startReviewSession()
      await sessionId.current
      return gradeItem(item, value, new Date())
    },
    onSuccess: (updated) => {
      setDone((n) => n + 1)
      setRevealed(false)
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
            {revealed ? (
              <CardBack item={current} />
            ) : (
              <button type="button" onClick={() => setRevealed(true)}>
                Mostra risposta
              </button>
            )}
          </article>

          {revealed && (
            <GradeButtons item={current} disabled={grade.isPending} onGrade={(value) => grade.mutate({ item: current, value })} />
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

function GradeButtons({ item, disabled, onGrade }: { item: ReviewItem; disabled: boolean; onGrade: (g: Grade) => void }) {
  const now = new Date()
  const next = previewDue(item, now)
  return (
    <div className="grades">
      {GRADES.map(({ grade, label }) => (
        <button key={grade} type="button" disabled={disabled} onClick={() => onGrade(grade)}>
          <span>{label}</span>
          <small>{formatInterval(next[grade], now)}</small>
        </button>
      ))}
    </div>
  )
}
