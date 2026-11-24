import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { LessonStatsRow } from './stats'
import type { LessonResponse } from './types'

async function functionError(error: unknown, fallback: string): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    const payload: unknown = await (error.context as Response).json().catch(() => null)
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const e = payload.error
      if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return new Error(e.message)
    }
  }
  return new Error(fallback)
}

export async function getLesson(lessonId: number): Promise<LessonResponse> {
  const { data, error } = await supabase.functions.invoke<LessonResponse>('lesson', {
    body: { action: 'get', lesson_id: lessonId },
  })
  if (error) throw await functionError(error, 'Non riesco ad aprire la lezione. Riprova tra poco.')
  if (!data) throw new Error('Risposta vuota dal server.')
  return data
}

/** Prepares the lessons of a chapter in the background; failures are not shown. */
export function prefetchChapter(chapterId: number): void {
  void supabase.functions.invoke('lesson', { body: { action: 'prefetch', chapter_id: chapterId } }).catch(() => undefined)
}

export async function completeLesson(lessonId: number, score: number): Promise<void> {
  const { error } = await supabase
    .from('lesson_progress')
    .upsert({ lesson_id: lessonId, score, completed_at: new Date().toISOString() })
  if (error) throw error
}

/** Adds the lesson's words and expressions to spaced-repetition review; returns how many were new. */
export async function addToReview(userId: string, items: { en: string; it: string }[]): Promise<number> {
  const normalized = items.map((i) => ({ en: i.en.trim().toLowerCase(), it: i.it.trim() })).filter((i) => i.en && i.it)
  if (!normalized.length) return 0
  const { data: existing, error } = await supabase
    .from('vocab_items')
    .select('en')
    .eq('user_id', userId)
    .in(
      'en',
      normalized.map((i) => i.en),
    )
  if (error) throw error
  const known = new Set((existing ?? []).map((v) => v.en.toLowerCase()))
  const fresh = normalized.filter((i, idx) => !known.has(i.en) && normalized.findIndex((x) => x.en === i.en) === idx)
  if (!fresh.length) return 0
  const { error: insertError } = await supabase.from('vocab_items').insert(fresh)
  if (insertError && insertError.code !== '23505') throw insertError
  return fresh.length
}

/** Saves the answers of a completed lesson (validated by the record_lesson_stats RPC). */
export async function recordLessonStats(
  lessonId: number,
  stats: { answers: number; correct: number; bestStreak: number },
): Promise<void> {
  const { error } = await supabase.rpc('record_lesson_stats', {
    p_lesson_id: lessonId,
    p_answers: stats.answers,
    p_correct: stats.correct,
    p_best_streak: stats.bestStreak,
  })
  if (error) throw error
}

/** Stats of the learner's completed lessons in a chapter. */
export async function fetchChapterStats(chapterId: number): Promise<LessonStatsRow[]> {
  const { data, error } = await supabase
    .from('lesson_stats')
    .select('lesson_id, answers, correct, best_streak')
    .eq('chapter_id', chapterId)
  if (error) throw error
  return data
}
