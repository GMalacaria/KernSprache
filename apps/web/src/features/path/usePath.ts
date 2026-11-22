import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../home/useProfile'
import { prefetchChapter } from '../lesson/api'
import { buildPath, type ChapterRow, type ChapterView } from './progress'

async function fetchChapters(): Promise<ChapterRow[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, level, sort_order, title, description_it, lessons (id, sort_order, title)')
    .order('level')
    .order('sort_order')
  if (error) throw error
  return data
}

async function fetchCompletedLessonIds(): Promise<number[]> {
  const { data, error } = await supabase.from('lesson_progress').select('lesson_id')
  if (error) throw error
  return data.map((row) => row.lesson_id)
}

/** The learner's path: chapters with status, built from curriculum, level and progress. */
export function usePath(userId: string): { path: ChapterView[] | undefined; isError: boolean } {
  const profile = useProfile(userId)
  const chapters = useQuery({ queryKey: ['chapters'], queryFn: fetchChapters, staleTime: Infinity })
  const completed = useQuery({ queryKey: ['lesson-progress'], queryFn: fetchCompletedLessonIds })

  if (!profile.data || !chapters.data || !completed.data) {
    return { path: undefined, isError: profile.isError || chapters.isError || completed.isError }
  }
  return {
    path: buildPath({
      chapters: chapters.data,
      level: profile.data.level,
      completedLessonIds: new Set(completed.data),
      // Chapter tests come next: until then no chapter counts as passed.
      passedChapterIds: new Set(),
    }),
    isError: false,
  }
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
