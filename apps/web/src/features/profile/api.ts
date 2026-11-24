import { supabase } from '../../lib/supabase'
import type { LessonStatsRow } from '../lesson/stats'
import type { StudyDayRow } from './profileStats'

export interface ProfileData {
  days: StudyDayRow[]
  lessonStats: LessonStatsRow[]
  /** Words and mistakes in the review. */
  reviewCards: number
}

/** Everything the profile shows, read in one go (each table is limited to the learner's own rows by RLS). */
export async function fetchProfileData(): Promise<ProfileData> {
  const [days, lessonStats, vocab, mistakes] = await Promise.all([
    supabase
      .from('study_days')
      .select('day, written_seconds, oral_seconds, completed_at')
      .order('day', { ascending: false })
      .limit(400),
    supabase.from('lesson_stats').select('lesson_id, answers, correct, best_streak'),
    supabase.from('vocab_items').select('id', { count: 'exact', head: true }),
    supabase.from('mistakes').select('id', { count: 'exact', head: true }),
  ])
  for (const result of [days, lessonStats, vocab, mistakes]) {
    if (result.error) throw result.error
  }
  return {
    days: days.data ?? [],
    lessonStats: lessonStats.data ?? [],
    reviewCards: (vocab.count ?? 0) + (mistakes.count ?? 0),
  }
}
