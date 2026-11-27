import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Grade } from 'ts-fsrs'
import { useStudiedLanguage } from '../languages/useLanguage'
import { usePracticeActivity } from '../study/useStudyTimer'
import { endReviewSession, fetchDueItems, gradeItem, startReviewSession, type ReviewItem } from './api'
import { BackHeader } from '../../components/BackHeader'
import { Waiting } from '../../components/Waiting'
import { GRADE_KEYS } from './grading'
import { dueSummary } from './summary'
import { PronunciationCard, SentenceCard, VocabCard } from './ReviewCards'

// Cards graded "Again" come back in the same sitting once they are due again (minutes away).
const REQUEUE_WITHIN_MS = 30 * 60_000

export function ReviewPage({ onExit }: { onExit: () => void }) {
  const { t } = useTranslation('review')
  const queryClient = useQueryClient()
  const language = useStudiedLanguage()
  const due = useQuery({
    queryKey: ['review', 'due-items', language],
    queryFn: () => fetchDueItems(new Date(), language),
    staleTime: 0,
    gcTime: 0,
  })

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
        {due.isPending && <Waiting title={t('loading')} compact />}
        {due.isError && <p className="error">{t('loadError')}</p>}
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
  const language = useStudiedLanguage()
  const { t } = useTranslation(['review', 'common'])
  const [queue, setQueue] = useState(initialItems)
  const [done, setDone] = useState(0)
  // The grade the app gave the current card and when: the next due date is computed from that moment.
  const [graded, setGraded] = useState<{ grade: Grade; at: Date } | null>(null)
  const sessionId = useRef<Promise<string> | null>(null)
  const current = queue[0]

  const save = useMutation({
    mutationFn: async ({ item, value, at }: { item: ReviewItem; value: Grade; at: Date }) => {
      sessionId.current ??= startReviewSession(language)
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
            <p>{t('allSkipped')}</p>
          ) : (
            <p>{t('finished', { count: done })}</p>
          )}
        </section>
      )}

      {current && (
        <>
          <p className="muted">
            {t('left', { count: queue.length })}
          </p>
          <ReviewCard key={`${current.kind}-${current.id}-${current.reps}`} item={current} onGraded={onGraded} onSkip={skip} />

          {graded && (
            <div className="review-result" role="status">
              <p>
                <strong>{t(`grades.${GRADE_KEYS[graded.grade]}`)}</strong>
              </p>
              {save.isError && (
                <>
                  <p className="error">{t('saveFailed')}</p>
                  <button type="button" className="secondary" onClick={() => save.variables && save.mutate(save.variables)}>
                    {t('common:actions.retry')}
                  </button>
                </>
              )}
              <button type="button" onClick={next} disabled={!save.isSuccess}>
                {save.isPending ? t('common:actions.saving') : t('common:actions.next')}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function ReviewHeader({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('review')
  return <BackHeader title={t('title')} onBack={onBack} />
}

/** The review's landing: how many cards are due and of which kind, and the button that starts it. */
function ReviewIntro({ items, onStart }: { items: ReviewItem[]; onStart: () => void }) {
  const { t } = useTranslation('review')
  if (items.length === 0) {
    return (
      <section className="notice">
        <p>{t('nothingDue')}</p>
      </section>
    )
  }
  const { words, grammar, pronunciation } = dueSummary(items)
  const parts = [
    words > 0 && t('kinds.words', { count: words }),
    grammar > 0 && t('kinds.grammar', { count: grammar }),
    pronunciation > 0 && t('kinds.pronunciation', { count: pronunciation }),
  ].filter((p): p is string => Boolean(p))
  return (
    <section className="review-intro stack">
      <p className="review-count">
        <strong>{items.length}</strong> {t('cards', { count: items.length })}
      </p>
      <ul className="review-kinds">
        {parts.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <button type="button" onClick={onStart}>
        {t('start')}
      </button>
    </section>
  )
}

function ReviewCard({ item, onGraded, onSkip }: { item: ReviewItem; onGraded: (g: Grade) => void; onSkip: () => void }) {
  if (item.kind === 'vocab') return <VocabCard item={item} onGraded={onGraded} />
  if (item.category === 'pronunciation') return <PronunciationCard item={item} onGraded={onGraded} onSkip={onSkip} />
  return <SentenceCard item={item} onGraded={onGraded} />
}
