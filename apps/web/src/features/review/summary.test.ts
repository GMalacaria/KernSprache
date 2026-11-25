import { describe, expect, it } from 'vitest'
import type { ReviewItem } from './api'
import { dueSummary } from './summary'

const fsrs = { due: '', stability: 0, difficulty: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0, last_review: null }
const vocab = { kind: 'vocab', id: 'v', en: 'hotel', it: 'albergo', ...fsrs } as ReviewItem
const mistake = (category: string) =>
  ({ kind: 'mistake', id: category, original: 'x', corrected: 'y', explanation_it: 'z', category, ...fsrs }) as ReviewItem

describe('dueSummary', () => {
  it('counts words, grammar mistakes and words to pronounce', () => {
    expect(dueSummary([vocab, vocab, mistake('verb_tense'), mistake('article'), mistake('pronunciation')])).toEqual({
      words: 2,
      grammar: 2,
      pronunciation: 1,
    })
  })
  it('is all zero with nothing due', () => {
    expect(dueSummary([])).toEqual({ words: 0, grammar: 0, pronunciation: 0 })
  })
})
