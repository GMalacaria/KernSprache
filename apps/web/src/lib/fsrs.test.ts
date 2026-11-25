import { describe, expect, it } from 'vitest'
import { Rating, State } from 'ts-fsrs'
import { scheduler, toCard, toColumns, type FsrsColumns } from './fsrs'

const NEW_ROW: FsrsColumns = {
  due: '2026-11-22T10:00:00.000Z',
  stability: 0,
  difficulty: 0,
  scheduled_days: 0,
  learning_steps: 0,
  reps: 0,
  lapses: 0,
  state: 0,
  last_review: null,
}

describe('fsrs mapping', () => {
  it('round-trips database columns through a ts-fsrs card', () => {
    const card = toCard(NEW_ROW)
    expect(card.state).toBe(State.New)
    expect(card.last_review).toBeUndefined()
    expect(toColumns(card)).toEqual(NEW_ROW)
  })

  it('schedules a reviewed card later and records the review', () => {
    const now = new Date('2026-11-22T10:00:00Z')
    const { card } = scheduler.next(toCard(NEW_ROW), now, Rating.Good)
    const row = toColumns(card)
    expect(row.reps).toBe(1)
    expect(row.last_review).toBe(now.toISOString())
    expect(new Date(row.due).getTime()).toBeGreaterThan(now.getTime())
  })
})
