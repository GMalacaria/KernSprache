import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'

type Language = Database['public']['Enums']['language_code']
import { useProfile } from '../home/useProfile'
import { prefetchChapter } from '../lesson/api'
import { fetchPassedChapterIds } from '../chapter-test/api'
import { buildPath, type CefrLevel, type ChapterRow, type ChapterView } from './progress'

/** The curriculum of one studied language: each language has its own 24 chapters. */
async function fetchChapters(language: Language): Promise<ChapterRow[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, level, sort_order, title, description, lessons (id, sort_order, title)')
    .eq('language', language)
    .order('level')
    .order('sort_order')
  if (error) throw error
  return data
}

async function fetchCompletedLessonIds(): Promise<number[]> {
  // A row also exists for a lesson with only one part done: completed means both parts.
  const { data, error } = await supabase.from('lesson_progress').select('lesson_id').not('completed_at', 'is', null)
  if (error) throw error
  return data.map((row) => row.lesson_id)
}

/** The path of one language: chapters with status, built from its curriculum, the level and the progress. */
export function usePathOf(
  language: Language | undefined,
  level: CefrLevel | undefined,
): { path: ChapterView[] | undefined; isError: boolean } {
  const chapters = useQuery({
    queryKey: ['chapters', language],
    queryFn: () => fetchChapters(language as Language),
    enabled: language !== undefined,
    staleTime: Infinity,
  })
  // Progress and passed tests are read once for all languages: chapter and lesson ids are unique across them.
  const completed = useQuery({ queryKey: ['lesson-progress'], queryFn: fetchCompletedLessonIds })
  const passed = useQuery({ queryKey: ['passed-chapters'], queryFn: fetchPassedChapterIds })

  if (!level || !chapters.data || !completed.data || !passed.data) {
    return { path: undefined, isError: chapters.isError || completed.isError || passed.isError }
  }
  return {
    path: buildPath({
      chapters: chapters.data,
      level,
      completedLessonIds: new Set(completed.data),
      passedChapterIds: new Set(passed.data),
    }),
    isError: false,
  }
}

/** The learner's path in the language being studied. */
export function usePath(userId: string): { path: ChapterView[] | undefined; isError: boolean } {
  const profile = useProfile(userId)
  const result = usePathOf(profile.data?.active_language, profile.data?.level)
  return { path: result.path, isError: result.isError || profile.isError }
}

/** Prepares the current chapter's lessons in the background as soon as the path is known. */
export function usePrefetchCurrentChapter(path: ChapterView[] | undefined): void {
  const currentChapterId = path?.find((c) => c.status === 'current')?.id
  useEffect(() => {
    if (currentChapterId !== undefined) prefetchChapter(currentChapterId)
  }, [currentChapterId])
}

/** Next lesson in the same chapter and the chapter after it, for the lesson screen. */
export function neighbours(
  path: ChapterView[] | undefined,
  lessonId: number,
): { nextLessonId?: number; nextChapterId?: number } {
  if (!path) return {}
  const index = path.findIndex((c) => c.lessons.some((l) => l.id === lessonId))
  const chapter = path[index]
  if (!chapter) return {}
  const position = chapter.lessons.findIndex((l) => l.id === lessonId)
  return { nextLessonId: chapter.lessons[position + 1]?.id, nextChapterId: path[index + 1]?.id }
}

/** Chapter that follows the given one, to prepare its lessons once the chapter test is passed. */
export function chapterAfter(path: ChapterView[] | undefined, chapterId: number): ChapterView | undefined {
  const index = path?.findIndex((c) => c.id === chapterId) ?? -1
  return index >= 0 ? path?.[index + 1] : undefined
}
