import { i18n } from '../../i18n'
import { functionErrorMessage } from '../../lib/functionError'
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
  /** In the native language. */
  prompt: string
}

export interface ChapterTest {
  test_id: string
  questions: TestQuestion[]
  oral_tasks: OralTask[]
}

export interface QuestionReview {
  id: string
  sentence: string
  translation: string
}

export interface ChapterTestResult {
  chapter_id: number
  written: {
    correct: number
    total: number
    score: number
    wrong: { id: string; chosen: number | null; answer: number }[]
  }
  /** Full sentence and translation of every question. */
  review: QuestionReview[]
  oral: {
    score: number
    feedback: string
    strengths: string[]
    to_improve: string[]
  }
  score: number
  passed: boolean
  level: CefrLevel | null
}

async function invoke<T>(body: object, fallback: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('chapter-test', { body })
  if (error) throw new Error(await functionErrorMessage(error, fallback))
  if (!data) throw new Error(i18n.t('errors.emptyResponse'))
  return data
}

export function startChapterTest(chapterId: number) {
  return invoke<ChapterTest>(
    { action: 'start', chapter_id: chapterId },
    i18n.t('chapter.errors.start', { ns: 'tests' }),
  )
}

export function submitChapterTest(
  testId: string,
  answers: Record<string, number>,
  oral: { id: string; transcript: string }[],
) {
  return invoke<ChapterTestResult>(
    { action: 'submit', test_id: testId, answers, oral },
    i18n.t('chapter.errors.submit', { ns: 'tests' }),
  )
}

/** Ids of the chapters whose test the learner has passed. */
export async function fetchPassedChapterIds(): Promise<number[]> {
  const { data, error } = await supabase.from('chapter_test_attempts').select('chapter_id').eq('passed', true)
  if (error) throw error
  return [...new Set(data.map((row) => row.chapter_id))]
}
