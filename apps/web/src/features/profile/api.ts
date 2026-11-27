import { supabase } from '../../lib/supabase'
import type { StudiedLanguage } from '../languages/languages'
import type { LessonStatsRow } from '../lesson/stats'
import type { StudyDayRow } from './profileStats'

export interface ProfileData {
  /** Global: the daily goal is one for all languages. */
  days: StudyDayRow[]
  /** The rest is about one language, or all of them together. */
  lessonStats: LessonStatsRow[]
  /** Words and mistakes in the review. */
  reviewCards: number
  /** Judged recordings: how many and their average score (null when none). */
  pronunciation: { count: number; average: number | null }
  /** Dictation sentences done: how many and their average score (null when none). */
  dictation: { count: number; average: number | null }
}

function average(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null
}

/** Statistics of one studied language, or of all of them together. */
export type StatsScope = StudiedLanguage | 'all'

/** Everything the profile shows, read in one go (each table is limited to the learner's own rows by RLS). */
export async function fetchProfileData(scope: StatsScope): Promise<ProfileData> {
  const all = scope === 'all'
  const lessonStatsQuery = supabase.from('lesson_stats').select('lesson_id, answers, correct, best_streak, chapters!inner (language)')
  const vocabQuery = supabase.from('vocab_items').select('id', { count: 'exact', head: true })
  const mistakesQuery = supabase.from('mistakes').select('id', { count: 'exact', head: true })
  const pronunciationQuery = supabase.from('pronunciation_results').select('score').limit(1000)
  const dictationQuery = supabase
    .from('dictation_results')
    .select('score, lessons!inner (chapters!inner (language))')
    .limit(1000)
  const [days, lessonStats, vocab, mistakes, pronunciation, dictation] = await Promise.all([
    supabase
      .from('study_days')
      .select('day, written_seconds, oral_seconds, completed_at')
      .order('day', { ascending: false })
      .limit(400),
    all ? lessonStatsQuery : lessonStatsQuery.eq('chapters.language', scope),
    all ? vocabQuery : vocabQuery.eq('language', scope),
    all ? mistakesQuery : mistakesQuery.eq('language', scope),
    all ? pronunciationQuery : pronunciationQuery.eq('language', scope),
    all ? dictationQuery : dictationQuery.eq('lessons.chapters.language', scope),
  ])
  for (const result of [days, lessonStats, vocab, mistakes, pronunciation, dictation]) {
    if (result.error) throw result.error
  }
  const pronunciationScores = (pronunciation.data ?? []).map((r) => r.score)
  const dictationScores = (dictation.data ?? []).map((r) => r.score)
  return {
    days: days.data ?? [],
    lessonStats: (lessonStats.data ?? []).map(({ lesson_id, answers, correct, best_streak }) => ({
      lesson_id,
      answers,
      correct,
      best_streak,
    })),
    reviewCards: (vocab.count ?? 0) + (mistakes.count ?? 0),
    pronunciation: { count: pronunciationScores.length, average: average(pronunciationScores) },
    dictation: { count: dictationScores.length, average: average(dictationScores) },
  }
}
