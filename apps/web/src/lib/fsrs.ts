import { fsrs, State, type Card } from 'ts-fsrs'

/** Single scheduler with default FSRS parameters (fuzz spreads reviews over nearby days). */
export const scheduler = fsrs({ enable_fuzz: true })

/** FSRS columns shared by vocab_items and mistakes. */
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
