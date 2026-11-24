/** Stats of one completed lesson, as saved in lesson_stats. */
export interface LessonStatsRow {
  lesson_id: number
  answers: number
  correct: number
  best_streak: number
}

export interface StatsSummary {
  lessons: number
  answers: number
  mistakes: number
  /** Longest run of correct answers within a single lesson. */
  bestStreak: number
  /** 0-100, null when there were no answers. */
  successRate: number | null
}

/** Totals over the lessons of a chapter (or a single lesson). */
export function summarizeStats(rows: LessonStatsRow[]): StatsSummary {
  const answers = rows.reduce((n, r) => n + r.answers, 0)
  const correct = rows.reduce((n, r) => n + r.correct, 0)
  return {
    lessons: rows.length,
    answers,
    mistakes: answers - correct,
    bestStreak: rows.reduce((n, r) => Math.max(n, r.best_streak), 0),
    successRate: answers === 0 ? null : Math.round((correct / answers) * 100),
  }
}
