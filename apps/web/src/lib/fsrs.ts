import { fsrs, State, type Card, type Grade } from 'ts-fsrs'

/** Single scheduler with default FSRS parameters (fuzz spreads reviews over nearby days). */
export const scheduler = fsrs({ enable_fuzz: true })

/**
 * FSRS columns shared by vocab_items and mistakes. `elapsed_days` also exists in the
 * tables but ts-fsrs 6 no longer uses it, so it is neither read nor written.
 */
export interface FsrsColumns {
  due: string
  stability: number
  difficulty: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review: string | null
}

const STATES = [State.New, State.Learning, State.Review, State.Relearning] as const

export function toCard(row: FsrsColumns): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: STATES[row.state] ?? State.New,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  }
}

export function toColumns(card: Card): FsrsColumns {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  }
}

/** Next due date for each grade, for the labels on the rating buttons. */
export function previewDue(row: FsrsColumns, now: Date): Record<Grade, Date> {
  const preview = scheduler.repeat(toCard(row), now)
  const result = {} as Record<Grade, Date>
  for (const item of preview) result[item.log.rating as Grade] = item.card.due
  return result
}

/** Short Italian label for how far away a date is, e.g. "10 min", "3 g", "2 mesi". */
export function formatInterval(due: Date, now: Date): string {
  const minutes = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} g`
  const months = Math.round(days / 30)
  if (months < 12) return months === 1 ? '1 mese' : `${months} mesi`
  const years = Math.round(days / 365)
  return years === 1 ? '1 anno' : `${years} anni`
}
