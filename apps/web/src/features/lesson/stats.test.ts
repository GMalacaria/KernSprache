import { describe, expect, it } from 'vitest'
import { addAnswer, EMPTY_TALLY, makeQuestion } from './quiz'
import { summarizeStats } from './stats'

describe('lesson stats', () => {
  it('addAnswer tracks the longest run of correct answers', () => {
    const answers = [true, true, false, true, true, true, false, true]
    const tally = answers.reduce(addAnswer, EMPTY_TALLY)
    expect(tally).toEqual({ answered: 8, correct: 6, streak: 1, bestStreak: 3 })
  })

  it('summarizeStats adds up a chapter', () => {
    const summary = summarizeStats([
      { lesson_id: 1, answers: 20, correct: 18, best_streak: 12 },
      { lesson_id: 2, answers: 20, correct: 15, best_streak: 6 },
    ])
    expect(summary).toEqual({ lessons: 2, answers: 40, mistakes: 7, bestStreak: 12, successRate: 83 })
  })

  it('makeQuestion keeps the sentence and translation shown after answering', () => {
    const q = makeQuestion('?', 'hotel', ['city'], 1, true, { text: 'hotel', translation: 'albergo' })
    expect(q.feedback).toEqual({ text: 'hotel', translation: 'albergo' })
    expect(makeQuestion('?', 'hotel', ['city'], 1).feedback).toBeUndefined()
  })

  it('summarizeStats has no success rate without answers', () => {
    expect(summarizeStats([]).successRate).toBeNull()
  })
})
