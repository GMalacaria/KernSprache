import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Grade } from 'ts-fsrs'
import { formatInterval } from '../../lib/fsrs'
import { StudyPrompts } from '../study/StudyPrompts'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyActivity } from '../study/useStudyTimer'
import { endReviewSession, fetchDueItems, gradeItem, startReviewSession, type ReviewItem } from './api'
import { Waiting } from '../../components/Waiting'
import { GRADE_LABELS } from './grading'
import { PronunciationCard, SentenceCard, VocabCard } from './ReviewCards'

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
        {due.isPending ? <Waiting title="Preparo il ripasso" compact /> : <p className="error">Impossibile caricare le carte da ripassare.</p>}
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
  const [done, setDone] = useState(0)
  // The grade the app gave the current card and when: the next due date is computed from that moment.
  const [graded, setGraded] = useState<{ grade: Grade; at: Date } | null>(null)
  const sessionId = useRef<Promise<string> | null>(null)
  const current = queue[0]

  const save = useMutation({
    mutationFn: async ({ item, value, at }: { item: ReviewItem; value: Grade; at: Date }) => {
      sessionId.current ??= startReviewSession()
      await sessionId.current
      return gradeItem(item, value, at)
    },
  })

  function onGraded(value: Grade) {
    if (!current) return
    const at = new Date()
    setGraded({ grade: value, at })
    save.mutate({ item: current, value, at })
  }

  function next() {
    const updated = save.data
    if (!updated) return
    setDone((n) => n + 1)
    setGraded(null)
    save.reset()
    setQueue((prev) => {
      const rest = prev.slice(1)
      const comesBackSoon = new Date(updated.due).getTime() - Date.now() < REQUEUE_WITHIN_MS
      return comesBackSoon ? [...rest, updated] : rest
    })
  }

  /** Leaves the card for another time: it stays due and is not graded. */
  function skip() {
    setQueue((prev) => prev.slice(1))
  }

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
            <p>Ripasso finito: {done} carte. Le prossime torneranno quando è il momento giusto.</p>
          )}
        </section>
      )}

      {current && (
        <>
          <p className="muted">
            Ancora da ripassare: {queue.length}. L&apos;app valuta la risposta e decide quando riproporti la carta.
          </p>
          <ReviewCard key={`${current.kind}-${current.id}-${current.reps}`} item={current} onGraded={onGraded} onSkip={skip} />

          {graded && (
            <div className="review-result" role="status">
              <p>
                <strong>{GRADE_LABELS[graded.grade]}</strong>
                {save.isSuccess && <> · torna tra {formatInterval(new Date(save.data.due), graded.at)}</>}
              </p>
              {save.isError && (
                <>
                  <p className="error">Salvataggio non riuscito.</p>
                  <button type="button" className="secondary" onClick={() => save.variables && save.mutate(save.variables)}>
                    Riprova
                  </button>
                </>
              )}
              <button type="button" onClick={next} disabled={!save.isSuccess}>
                {save.isPending ? 'Salvo…' : 'Avanti'}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function ReviewCard({ item, onGraded, onSkip }: { item: ReviewItem; onGraded: (g: Grade) => void; onSkip: () => void }) {
  if (item.kind === 'vocab') return <VocabCard item={item} onGraded={onGraded} />
  if (item.category === 'pronunciation') return <PronunciationCard item={item} onGraded={onGraded} onSkip={onSkip} />
  return <SentenceCard item={item} onGraded={onGraded} />
}
