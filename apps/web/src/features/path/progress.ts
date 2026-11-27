import type { Database } from '../../lib/database.types'

export type CefrLevel = Database['public']['Enums']['cefr_level']
export const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2']

export interface LessonRow {
  id: number
  sort_order: number
  title: string
}

export interface ChapterRow {
  id: number
  level: CefrLevel
  sort_order: number
  title: string
  description: string
  lessons: LessonRow[]
}

export type ChapterStatus = 'skipped' | 'done' | 'current' | 'locked'
export type LessonStatus = 'done' | 'available' | 'locked'

export interface LessonView extends LessonRow {
  status: LessonStatus
}

export interface ChapterView extends Omit<ChapterRow, 'lessons'> {
  status: ChapterStatus
  lessons: LessonView[]
  completedLessons: number
  /** All lessons done in the current chapter: the chapter test can start. */
  testAvailable: boolean
  /** A locked chapter ahead: its test can be taken to skip to it. */
  skipTestAvailable: boolean
}

export interface PathInput {
  chapters: ChapterRow[]
  level: CefrLevel
  completedLessonIds: ReadonlySet<number>
  passedChapterIds: ReadonlySet<number>
}

function byOrder<T extends { sort_order: number }>(a: T, b: T): number {
  return a.sort_order - b.sort_order
}

/**
 * Chapters below the learner's level are skipped (placement test), and so are
 * those before the furthest chapter whose test was passed (skip-ahead test).
 * From there on, the first chapter whose test is not passed is the current one
 * and later chapters are locked. Inside a chapter, lessons unlock one after another.
 */
export function buildPath({ chapters, level, completedLessonIds, passedChapterIds }: PathInput): ChapterView[] {
  const sorted = [...chapters].sort(
    (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.sort_order - b.sort_order,
  )
  let currentFound = false
  const furthestPassed = sorted.reduce((max, c, i) => (passedChapterIds.has(c.id) ? i : max), -1)

  return sorted.map((chapter, index) => {
    let status: ChapterStatus
    if (LEVELS.indexOf(chapter.level) < LEVELS.indexOf(level)) status = 'skipped'
    else if (passedChapterIds.has(chapter.id)) status = 'done'
    else if (index < furthestPassed) status = 'skipped'
    else if (!currentFound) {
      status = 'current'
      currentFound = true
    } else status = 'locked'

    const lessons = [...chapter.lessons].sort(byOrder)
    let previousDone = true
    const lessonViews: LessonView[] = lessons.map((lesson) => {
      const done = completedLessonIds.has(lesson.id)
      let lessonStatus: LessonStatus
      if (done) lessonStatus = 'done'
      else if (status === 'locked') lessonStatus = 'locked'
      else if (status !== 'current' || previousDone) lessonStatus = 'available'
      else lessonStatus = 'locked'
      previousDone = done
      return { ...lesson, status: lessonStatus }
    })
    const completedLessons = lessonViews.filter((l) => l.status === 'done').length

    return {
      ...chapter,
      status,
      lessons: lessonViews,
      completedLessons,
      testAvailable: status === 'current' && lessons.length > 0 && completedLessons === lessons.length,
      skipTestAvailable: status === 'locked',
    }
  })
}

/** The lesson to suggest on the home screen: first available lesson of the current chapter. */
export function nextLesson(path: ChapterView[]): { chapter: ChapterView; lesson: LessonView } | null {
  const chapter = path.find((c) => c.status === 'current')
  if (!chapter) return null
  const lesson = chapter.lessons.find((l) => l.status === 'available')
  return lesson ? { chapter, lesson } : null
}

/** The chapter whose lessons are all done but whose test is still to be taken. */
export function chapterAwaitingTest(path: ChapterView[]): ChapterView | null {
  return path.find((c) => c.testAvailable) ?? null
}
