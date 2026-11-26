import { i18n } from '../../i18n'
import { functionErrorMessage } from '../../lib/functionError'
import { supabase } from '../../lib/supabase'
import {
  combineStats,
  otherPart,
  parseStats,
  partDone,
  statsScore,
  type LessonPart,
  type LessonProgressRow,
  type PartStats,
} from './parts'
import type { LessonStatsRow } from './stats'
import type { DictationResult } from './DictationExercise'
import type { LessonResponse, Translated } from './types'

export async function getLesson(lessonId: number): Promise<LessonResponse> {
  const { data, error } = await supabase.functions.invoke<LessonResponse>('lesson', {
    body: { action: 'get', lesson_id: lessonId },
  })
  if (error) throw new Error(await functionErrorMessage(error, i18n.t('errors.open', { ns: 'lesson' })))
  if (!data) throw new Error(i18n.t('errors.emptyResponse'))
  return data
}

/** Prepares the lessons of a chapter in the background; failures are not shown. */
export function prefetchChapter(chapterId: number): void {
  void supabase.functions.invoke('lesson', { body: { action: 'prefetch', chapter_id: chapterId } }).catch(() => undefined)
}

/** The learner's progress on one lesson (which parts are done), or null if never started. */
export async function fetchLessonProgress(lessonId: number): Promise<LessonProgressRow | null> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('written_done_at, oral_done_at, written_stats, oral_stats, completed_at')
    .eq('lesson_id', lessonId)
    .maybeSingle()
  if (error) throw error
  return data
}

export interface SavedPart {
  /** The lesson is now completed (both parts done). */
  completed: boolean
  /** Answers of both parts together, when completed. */
  total: PartStats | null
}

/**
 * Marks one part of a lesson as done with its answers. When the other part is already done the
 * lesson is completed too: score over both parts (the database rejects completing with one part).
 */
export async function savePart(lessonId: number, part: LessonPart, stats: PartStats): Promise<SavedPart> {
  // Read the row again: the other part may have been finished since the lesson was opened.
  const previous = await fetchLessonProgress(lessonId)
  const now = new Date().toISOString()
  const done = part === 'written' ? { written_done_at: now, written_stats: { ...stats } } : { oral_done_at: now, oral_stats: { ...stats } }
  const other = otherPart(part)
  if (!partDone(previous, other)) {
    const { error } = await supabase.from('lesson_progress').upsert({ lesson_id: lessonId, ...done })
    if (error) throw error
    return { completed: false, total: null }
  }
  const total = combineStats(stats, parseStats(other === 'written' ? previous?.written_stats : previous?.oral_stats))
  // An update, not an upsert: the row exists (the other part is in it), and an upsert would check the
  // constraints on a new row without the other part first, so completing would always be rejected.
  const { error } = await supabase
    .from('lesson_progress')
    .update({
      ...done,
      score: statsScore(total),
      // A lesson redone keeps the day it was first completed.
      completed_at: previous?.completed_at ?? now,
    })
    .eq('lesson_id', lessonId)
  if (error) throw error
  return { completed: true, total }
}

/** Adds the lesson's words and expressions to spaced-repetition review; returns how many were new. */
export async function addToReview(userId: string, items: Translated[]): Promise<number> {
  // vocab_items still has the single-language column names (en = studied language, it = translation).
  const normalized = items
    .map((i) => ({ en: i.text.trim().toLowerCase(), it: i.translation.trim() }))
    .filter((i) => i.en && i.it)
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
export async function recordLessonStats(lessonId: number, stats: PartStats): Promise<void> {
  const { error } = await supabase.rpc('record_lesson_stats', {
    p_lesson_id: lessonId,
    p_answers: stats.answers,
    p_correct: stats.correct,
    p_best_streak: stats.best_streak,
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

/** Keeps the score of a dictation sentence for the profile. Never throws: the lesson goes on anyway. */
export function saveDictationResult(lessonId: number, result: DictationResult): void {
  void supabase
    .from('dictation_results')
    .insert({
      lesson_id: lessonId,
      sentence: result.sentence,
      score: result.score,
      wrong_attempts: result.wrongAttempts,
      text_shown: result.textShown,
    })
    .then(({ error }) => {
      if (error) console.error('Failed to save the dictation result', error)
    })
}
