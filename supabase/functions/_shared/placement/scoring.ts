import { CEFR_LEVELS, type CefrLevel, WRITTEN_QUESTIONS, type WrittenQuestion } from './questions.ts'

/** A level counts as passed with at least 3 correct answers out of 4. */
export const PASS_PER_LEVEL = 3

export interface WrittenResult {
  correct: number
  total: number
  byLevel: Record<CefrLevel, { correct: number; total: number }>
  level: CefrLevel
}

/**
 * Written level = highest level passed with every level below it passed too.
 * Nothing passed still means A1: the learner starts from the beginning.
 */
export function scoreWritten(
  answers: Record<string, number>,
  questions: WrittenQuestion[] = WRITTEN_QUESTIONS,
): WrittenResult {
  const byLevel = Object.fromEntries(CEFR_LEVELS.map((l) => [l, { correct: 0, total: 0 }])) as WrittenResult['byLevel']
  for (const q of questions) {
    byLevel[q.level].total++
    if (answers[q.id] === q.answer) byLevel[q.level].correct++
  }
  let level: CefrLevel = 'A1'
  for (const l of CEFR_LEVELS) {
    const { correct, total } = byLevel[l]
    if (total === 0 || correct < Math.min(PASS_PER_LEVEL, total)) break
    level = l
  }
  const correct = CEFR_LEVELS.reduce((n, l) => n + byLevel[l].correct, 0)
  return { correct, total: questions.length, byLevel, level }
}

/** Combines written and oral levels, rounding down: lessons that are too easy beat lessons that are too hard. */
export function combineLevels(written: CefrLevel, oral: CefrLevel | null): CefrLevel {
  if (!oral) return written
  const index = Math.floor((CEFR_LEVELS.indexOf(written) + CEFR_LEVELS.indexOf(oral)) / 2)
  return CEFR_LEVELS[index]!
}
