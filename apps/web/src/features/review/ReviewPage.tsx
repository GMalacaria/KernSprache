import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Grade } from 'ts-fsrs'
import { usePracticeActivity } from '../study/useStudyTimer'
import { endReviewSession, fetchDueItems, gradeItem, startReviewSession, type ReviewItem } from './api'
import { BackHeader } from '../../components/BackHeader'
import { Waiting } from '../../components/Waiting'
import { GRADE_LABELS } from './grading'
import { dueSummary } from './summary'
import { PronunciationCard, SentenceCard, VocabCard } from './ReviewCards'

// Cards graded "Again" come back in the same sitting once they are due again (minutes away).
const REQUEUE_WITHIN_MS = 30 * 60_000

export function ReviewPage({ onExit }: { onExit: () => void }) {
  const queryClient = useQueryClient()
  const due = useQuery({ queryKey: ['review', 'due-items'], queryFn: () => fetchDueItems(new Date()), staleTime: 0, gcTime: 0 })

  async function exit(sessionId: Promise<string> | null, next: () => void = onExit) {
    if (sessionId) await endReviewSession(await sessionId).catch(() => undefined)
    await queryClient.invalidateQueries({ queryKey: ['review'] })
    next()
  }

  const [started, setStarted] = useState(false)

  // Landing first: what is due and a button to start. The practice time is counted only once the review
  // starts, so opening the screen (or finding nothing to review) is not saved as review time.
  if (due.isPending || due.isError || !started) {
    return (
      <main className="page review">
        <ReviewHeader onBack={() => void exit(null)} />
        {due.isPending && <Waiting title="Preparo il ripasso" compact />}
        {due.isError && <p className="error">Impossibile caricare le carte da ripassare.</p>}
        {due.isSuccess && <ReviewIntro items={due.data} onStart={() => setStarted(true)} />}
      </main>
    )
  }
  return (
    <ReviewSession
      initialItems={due.data}
      onExit={(id) => void exit(id)}
    />
  )
}

interface ReviewSessionProps {
  initialItems: ReviewItem[]
  onExit: (sessionId: Promise<string> | null) => void
}

function ReviewSession({ initialItems, onExit }: ReviewSessionProps) {
  // Review is extra practice: its time is saved for statistics, not counted towards the daily goal.
  usePracticeActivity('review')
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
      <ReviewHeader onBack={() => onExit(sessionId.current)} />


      {!current && (
        <section className="notice">
          {done === 0 ? (
            <p>Hai lasciato tutte le carte per un'altra volta: restano da ripassare.</p>
          ) : (
            <p>Ripasso finito: {done} carte. Le prossime torneranno quando è il momento giusto.</p>
          )}
        </section>
      )}

      {current && (
        <>
          <p className="muted">
            Ancora da ripassare: {queue.length}
          </p>
          <ReviewCard key={`${current.kind}-${current.id}-${current.reps}`} item={current} onGraded={onGraded} onSkip={skip} />

          {graded && (
            <div className="review-result" role="status">
              <p>
                <strong>{GRADE_LABELS[graded.grade]}</strong>
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

function ReviewHeader({ onBack }: { onBack: () => void }) {
  return <BackHeader title="Ripasso" onBack={onBack} />
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** The review's landing: how many cards are due and of which kind, and the button that starts it. */
function ReviewIntro({ items, onStart }: { items: ReviewItem[]; onStart: () => void }) {
  if (items.length === 0) {
    return (
      <section className="notice">
        <p>
          Non hai carte da ripassare adesso. Le parole delle lezioni e gli errori dei dialoghi arrivano qui quando è il
          momento di ripassarli.
        </p>
      </section>
    )
  }
  const { words, grammar, pronunciation } = dueSummary(items)
  const parts = [
    words > 0 && plural(words, 'parola da tradurre', 'parole da tradurre'),
    grammar > 0 && plural(grammar, 'errore da correggere', 'errori da correggere'),
    pronunciation > 0 && plural(pronunciation, 'parola da pronunciare', 'parole da pronunciare'),
  ].filter((p): p is string => Boolean(p))
  return (
    <section className="review-intro stack">
      <p className="review-count">
        <strong>{items.length}</strong> {items.length === 1 ? 'carta da ripassare' : 'carte da ripassare'}
      </p>
      <ul className="review-kinds">
        {parts.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <button type="button" onClick={onStart}>
        Inizia ripasso
      </button>
    </section>
  )
}

function ReviewCard({ item, onGraded, onSkip }: { item: ReviewItem; onGraded: (g: Grade) => void; onSkip: () => void }) {
  if (item.kind === 'vocab') return <VocabCard item={item} onGraded={onGraded} />
  if (item.category === 'pronunciation') return <PronunciationCard item={item} onGraded={onGraded} onSkip={onSkip} />
  return <SentenceCard item={item} onGraded={onGraded} />
}
