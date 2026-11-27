import { describe, expect, it } from 'vitest'
import { buildPath, chapterAwaitingTest, nextLesson, type ChapterRow } from './progress'

const lessons = (chapterId: number) =>
  [1, 2, 3, 4].map((n) => ({ id: chapterId * 10 + n, sort_order: n, title: `L${chapterId}.${n}` }))

const chapters: ChapterRow[] = [
  { id: 2, level: 'A1', sort_order: 2, title: 'A1-2', description: '', lessons: lessons(2) },
  { id: 1, level: 'A1', sort_order: 1, title: 'A1-1', description: '', lessons: lessons(1) },
  { id: 3, level: 'A2', sort_order: 1, title: 'A2-1', description: '', lessons: lessons(3) },
  { id: 4, level: 'A2', sort_order: 2, title: 'A2-2', description: '', lessons: lessons(4) },
]

const none = new Set<number>()

describe('buildPath', () => {
  it('starts a new A1 learner on the first chapter, first lesson', () => {
    const path = buildPath({ chapters, level: 'A1', completedLessonIds: none, passedChapterIds: none })
    expect(path.map((c) => [c.title, c.status])).toEqual([
      ['A1-1', 'current'],
      ['A1-2', 'locked'],
      ['A2-1', 'locked'],
      ['A2-2', 'locked'],
    ])
    expect(path[0]?.lessons.map((l) => l.status)).toEqual(['available', 'locked', 'locked', 'locked'])
    expect(nextLesson(path)?.lesson.title).toBe('L1.1')
  })

  it('skips chapters below the placement level', () => {
    const path = buildPath({ chapters, level: 'A2', completedLessonIds: none, passedChapterIds: none })
    expect(path.map((c) => c.status)).toEqual(['skipped', 'skipped', 'current', 'locked'])
    expect(path[0]?.lessons.every((l) => l.status === 'available')).toBe(true)
    expect(nextLesson(path)?.lesson.title).toBe('L3.1')
  })

  it('unlocks lessons one after another and the test after the last one', () => {
    const someDone = buildPath({ chapters, level: 'A1', completedLessonIds: new Set([11, 12]), passedChapterIds: none })
    expect(someDone[0]?.lessons.map((l) => l.status)).toEqual(['done', 'done', 'available', 'locked'])
    expect(someDone[0]?.testAvailable).toBe(false)

    const allDone = buildPath({
      chapters,
      level: 'A1',
      completedLessonIds: new Set([11, 12, 13, 14]),
      passedChapterIds: none,
    })
    expect(allDone[0]?.testAvailable).toBe(true)
    expect(allDone[0]?.completedLessons).toBe(4)
    expect(nextLesson(allDone)).toBeNull()
  })

  it('moves to the next chapter only when the chapter test is passed', () => {
    const path = buildPath({
      chapters,
      level: 'A1',
      completedLessonIds: new Set([11, 12, 13, 14]),
      passedChapterIds: new Set([1]),
    })
    expect(path.map((c) => c.status)).toEqual(['done', 'current', 'locked', 'locked'])
    expect(nextLesson(path)?.lesson.title).toBe('L2.1')
  })

  it('offers the test only for the current chapter once all lessons are done', () => {
    const base = { chapters, level: 'A1' as const, passedChapterIds: none }
    expect(chapterAwaitingTest(buildPath({ ...base, completedLessonIds: new Set([11, 12]) }))).toBeNull()
    const allDone = buildPath({ ...base, completedLessonIds: new Set([11, 12, 13, 14]) })
    expect(chapterAwaitingTest(allDone)?.title).toBe('A1-1')
    const passed = buildPath({ ...base, completedLessonIds: new Set([11, 12, 13, 14]), passedChapterIds: new Set([1]) })
    expect(chapterAwaitingTest(passed)).toBeNull()
  })

  it('skips the chapters before one whose test was passed ahead of the path', () => {
    const path = buildPath({ chapters, level: 'A1', completedLessonIds: none, passedChapterIds: new Set([3]) })
    expect(path.map((c) => c.status)).toEqual(['skipped', 'skipped', 'done', 'current'])
    expect(path.map((c) => c.skipTestAvailable)).toEqual([false, false, false, false])
    expect(nextLesson(path)?.lesson.title).toBe('L4.1')
  })

  it('offers the skip-ahead test only on locked chapters', () => {
    const path = buildPath({ chapters, level: 'A1', completedLessonIds: none, passedChapterIds: none })
    expect(path.map((c) => c.skipTestAvailable)).toEqual([false, true, true, true])
  })
})
