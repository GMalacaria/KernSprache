import { Rating, type Grade } from 'ts-fsrs'
import { scheduler, toCard, toColumns, type FsrsColumns } from '../../lib/fsrs'
import { supabase } from '../../lib/supabase'

const FSRS_SELECT = 'due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, state, last_review'

export const DAILY_REVIEW_LIMIT = 30

export type ReviewItem =
  | ({ kind: 'vocab'; id: string; en: string; it: string } & FsrsColumns)
  | ({ kind: 'mistake'; id: string; original: string; corrected: string; explanation_it: string } & FsrsColumns)

/** Cards due now from both sources, oldest first. */
export async function fetchDueItems(now: Date): Promise<ReviewItem[]> {
  const iso = now.toISOString()
  const [vocab, mistakes] = await Promise.all([
    supabase.from('vocab_items').select(`id, en, it, ${FSRS_SELECT}`).lte('due', iso).order('due').limit(DAILY_REVIEW_LIMIT),
    supabase
      .from('mistakes')
      .select(`id, original, corrected, explanation_it, ${FSRS_SELECT}`)
      .lte('due', iso)
      .order('due')
      .limit(DAILY_REVIEW_LIMIT),
  ])
  if (vocab.error) throw vocab.error
  if (mistakes.error) throw mistakes.error

  const items: ReviewItem[] = [
    ...vocab.data.map((v) => ({ ...v, kind: 'vocab' as const })),
    ...mistakes.data.map((m) => ({ ...m, kind: 'mistake' as const })),
  ]
  return items.sort((a, b) => a.due.localeCompare(b.due)).slice(0, DAILY_REVIEW_LIMIT)
}

/** Number of cards due now (vocabulary + mistakes). */
export async function fetchDueCount(now: Date): Promise<number> {
  const iso = now.toISOString()
  const [vocab, mistakes] = await Promise.all([
    supabase.from('vocab_items').select('id', { count: 'exact', head: true }).lte('due', iso),
    supabase.from('mistakes').select('id', { count: 'exact', head: true }).lte('due', iso),
  ])
  if (vocab.error) throw vocab.error
  if (mistakes.error) throw mistakes.error
  return (vocab.count ?? 0) + (mistakes.count ?? 0)
}

/** Applies the learner's grade with FSRS and stores the new schedule. Returns the updated item. */
export async function gradeItem(item: ReviewItem, grade: Grade, now: Date): Promise<ReviewItem> {
  const { card } = scheduler.next(toCard(item), now, grade)
  const columns = toColumns(card)
  const table = item.kind === 'vocab' ? 'vocab_items' : 'mistakes'
  const { error } = await supabase.from(table).update(columns).eq('id', item.id)
  if (error) throw error
  return { ...item, ...columns }
}

export async function startReviewSession(): Promise<string> {
  const { data, error } = await supabase.from('sessions').insert({ kind: 'review' }).select('id').single()
  if (error) throw error
  return data.id
}

export async function endReviewSession(id: string): Promise<void> {
  const { error } = await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export const GRADES: { grade: Grade; label: string }[] = [
  { grade: Rating.Again, label: 'Di nuovo' },
  { grade: Rating.Hard, label: 'Difficile' },
  { grade: Rating.Good, label: 'Bene' },
  { grade: Rating.Easy, label: 'Facile' },
]
