import type { OralTask, StoredQuestion } from '../schemas/chapter-test.ts'

/** Minimum final score (average of written and oral) to pass a chapter. */
export const PASS_SCORE = 70

export const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2'] as const
export type Level = (typeof CEFR_ORDER)[number]

export interface WrittenScore {
  correct: number
  total: number
  /** 0-100 */
  score: number
  wrong: { id: string; chosen: number | null; answer: number }[]
}

export function scoreWritten(questions: StoredQuestion[], answers: Record<string, number>): WrittenScore {
  const wrong: WrittenScore['wrong'] = []
  let correct = 0
  for (const q of questions) {
    if (answers[q.id] === q.answer) correct++
    else wrong.push({ id: q.id, chosen: answers[q.id] ?? null, answer: q.answer })
  }
  const total = questions.length
  return { correct, total, score: total === 0 ? 0 : Math.round((correct / total) * 100), wrong }
}

/** Mean of the task scores; a task with no score counts as 0. */
export function scoreOral(tasks: OralTask[], scores: { id: string; score: number }[]): number {
  if (tasks.length === 0) return 0
  const sum = tasks.reduce((n, t) => n + (scores.find((s) => s.id === t.id)?.score ?? 0), 0)
  return Math.round(sum / tasks.length)
}

export function combineScores(written: number, oral: number): { score: number; passed: boolean } {
  const score = Math.round((written + oral) / 2)
  return { score, passed: score >= PASS_SCORE }
}

/**
 * Level after passing a chapter: never below the chapter's own level (passing a
 * chapter ahead of the path skips the levels before it), and one level up when
 * it is the last chapter of the learner's own level (or of a higher one).
 */
export function levelAfterPass(current: Level, chapterLevel: Level, isLastOfLevel: boolean): Level {
  const higher = (a: Level, b: Level): Level => (CEFR_ORDER.indexOf(a) >= CEFR_ORDER.indexOf(b) ? a : b)
  const reached = higher(current, chapterLevel)
  if (!isLastOfLevel) return reached
  const next = CEFR_ORDER[Math.min(CEFR_ORDER.indexOf(chapterLevel) + 1, CEFR_ORDER.length - 1)]!
  return higher(reached, next)
}
