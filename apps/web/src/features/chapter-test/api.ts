import { FunctionsHttpError } from '@supabase/supabase-js'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'

// Mirrors supabase/functions/_shared/schemas/chapter-test.ts (responses of the `chapter-test` function).
export type CefrLevel = Database['public']['Enums']['cefr_level']

export interface TestQuestion {
  id: string
  prompt: string
  options: string[]
}

export interface OralTask {
  id: string
  prompt_it: string
}

export interface ChapterTest {
  test_id: string
  questions: TestQuestion[]
  oral_tasks: OralTask[]
}

export interface QuestionReview {
  id: string
  sentence_en: string | null
  translation_it: string | null
}

export interface ChapterTestResult {
  chapter_id: number
  written: {
    correct: number
    total: number
    score: number
    wrong: { id: string; chosen: number | null; answer: number }[]
  }
  /** Full sentence and translation of every question; missing from older servers, null for tests made before v2. */
  review?: QuestionReview[]
  oral: {
    score: number
    feedback_it: string
    strengths_it: string[]
    to_improve_it: string[]
  }
  score: number
  passed: boolean
  level: CefrLevel | null
}

async function invoke<T>(body: object, fallback: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('chapter-test', { body })
  if (error) {
    let message = fallback
    if (error instanceof FunctionsHttpError) {
      const payload: unknown = await (error.context as Response).json().catch(() => null)
      if (payload && typeof payload === 'object' && 'error' in payload) {
        const e = payload.error
        if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') message = e.message
      }
    }
    throw new Error(message)
  }
  if (!data) throw new Error('Risposta vuota dal server.')
  return data
}

export function startChapterTest(chapterId: number) {
  return invoke<ChapterTest>(
    { action: 'start', chapter_id: chapterId },
    'Non riesco a preparare la verifica. Riprova tra poco.',
  )
}

export function submitChapterTest(
  testId: string,
  answers: Record<string, number>,
  oral: { id: string; transcript: string }[],
) {
  return invoke<ChapterTestResult>(
    { action: 'submit', test_id: testId, answers, oral },
    'Non riesco a correggere la verifica. Riprova tra poco.',
  )
}

/** Ids of the chapters whose test the learner has passed. */
export async function fetchPassedChapterIds(): Promise<number[]> {
  const { data, error } = await supabase.from('chapter_test_attempts').select('chapter_id').eq('passed', true)
  if (error) throw error
  return [...new Set(data.map((row) => row.chapter_id))]
}
