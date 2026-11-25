import type { ReviewItem } from './api'

/** Counts of what is due, by kind of card. */
export function dueSummary(items: ReviewItem[]): { words: number; grammar: number; pronunciation: number } {
  let words = 0
  let grammar = 0
  let pronunciation = 0
  for (const item of items) {
    if (item.kind === 'vocab') words++
    else if (item.category === 'pronunciation') pronunciation++
    else grammar++
  }
  return { words, grammar, pronunciation }
}
