// A lesson has two parts, written and oral, and is completed only when both are done.
// Pure helpers (no React, no network) so the rules can be unit-tested.
import { dictationSentences, normalizeWords, type DictationSentence } from './dictation'
import { EMPTY_TALLY, lessonScore, type QuizTally } from './quiz'
import type { LessonContent } from './types'

export type LessonPart = 'written' | 'oral'


export function otherPart(part: LessonPart): LessonPart {
  return part === 'written' ? 'oral' : 'written'
}

/** Answers of one part, as saved in lesson_progress.written_stats / oral_stats. */
export interface PartStats {
  answers: number
  correct: number
  best_streak: number
}

/** The learner's row for one lesson (lesson_progress), as read by the PWA. */
export interface LessonProgressRow {
  written_done_at: string | null
  oral_done_at: string | null
  written_stats: unknown
  oral_stats: unknown
  completed_at: string | null
}

export function partDone(row: LessonProgressRow | null | undefined, part: LessonPart): boolean {
  return Boolean(part === 'written' ? row?.written_done_at : row?.oral_done_at)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/** Reads a stats column; anything malformed counts as no answers. */
export function parseStats(value: unknown): PartStats {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    if (isCount(v.answers) && isCount(v.correct) && isCount(v.best_streak) && v.correct <= v.answers) {
      return { answers: v.answers, correct: v.correct, best_streak: Math.min(v.best_streak, v.correct) }
    }
  }
  return { answers: 0, correct: 0, best_streak: 0 }
}

export function tallyToStats(tally: QuizTally): PartStats {
  return { answers: tally.answered, correct: tally.correct, best_streak: tally.bestStreak }
}

/** Both parts together, for the lesson score and lesson_stats: the longest run is the better of the two. */
export function combineStats(a: PartStats, b: PartStats): PartStats {
  return { answers: a.answers + b.answers, correct: a.correct + b.correct, best_streak: Math.max(a.best_streak, b.best_streak) }
}

export function statsScore(stats: PartStats): number {
  return lessonScore(stats.correct, stats.answers)
}

/**
 * The part to open: the first one still to do, preferring the one the daily timer suggests;
 * a completed lesson opens on the written part.
 */
export function initialPart(row: LessonProgressRow | null | undefined, recommended: LessonPart): LessonPart {
  const writtenDone = partDone(row, 'written')
  const oralDone = partDone(row, 'oral')
  if (writtenDone && !oralDone) return 'oral'
  if (oralDone && !writtenDone) return 'written'
  if (!writtenDone && !oralDone) return recommended
  return 'written'
}

export const MAX_REPEAT_SENTENCES = 3
const REPEAT_MIN_WORDS = 3
const REPEAT_MAX_WORDS = 14

/** Pronunciation score from which a repeated sentence counts as a right answer. */
export const REPEAT_PASS_SCORE = 70

/**
 * Sentences to read aloud in the oral part: grammar examples and word examples that the
 * dictation (written part) does not already use, so the two parts practise different sentences.
 */
export function repeatSentences(content: LessonContent): DictationSentence[] {
  const key = (text: string) => normalizeWords(text).join(' ')
  const used = new Set(dictationSentences(content).map((d) => key(d.text)))
  const candidates: DictationSentence[] = [
    ...content.grammar.examples,
    ...content.words.map((w) => ({ text: w.example, translation: '' })),
  ]
  const picked: DictationSentence[] = []
  for (const sentence of candidates) {
    const words = normalizeWords(sentence.text)
    const k = words.join(' ')
    if (words.length < REPEAT_MIN_WORDS || words.length > REPEAT_MAX_WORDS || used.has(k)) continue
    used.add(k)
    picked.push(sentence)
    if (picked.length === MAX_REPEAT_SENTENCES) break
  }
  return picked
}

/** Where the learner is inside a part, kept on the device so leaving the lesson does not lose it. */
export interface PartResume {
  sectionIndex: number
  tally: QuizTally
}

const EMPTY_RESUME: PartResume = { sectionIndex: 0, tally: EMPTY_TALLY }

function resumeKey(lessonId: number, part: LessonPart): string {
  return `kernsprache.lesson.${lessonId}.${part}`
}

export function loadResume(lessonId: number, part: LessonPart): PartResume {
  try {
    const raw = window.localStorage.getItem(resumeKey(lessonId, part))
    if (!raw) return EMPTY_RESUME
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return EMPTY_RESUME
    const v = value as Record<string, unknown>
    const t = (v.tally ?? {}) as Record<string, unknown>
    if (!isCount(v.sectionIndex) || !isCount(t.answered) || !isCount(t.correct) || !isCount(t.bestStreak)) {
      return EMPTY_RESUME
    }
    return {
      sectionIndex: v.sectionIndex,
      tally: { answered: t.answered, correct: t.correct, streak: isCount(t.streak) ? t.streak : 0, bestStreak: t.bestStreak },
    }
  } catch {
    return EMPTY_RESUME
  }
}

export function saveResume(lessonId: number, part: LessonPart, resume: PartResume): void {
  try {
    if (resume.sectionIndex === 0 && resume.tally.answered === 0) window.localStorage.removeItem(resumeKey(lessonId, part))
    else window.localStorage.setItem(resumeKey(lessonId, part), JSON.stringify(resume))
  } catch {
    // Storage unavailable: the part simply restarts from the beginning next time.
  }
}

export function clearResume(lessonId: number, part: LessonPart): void {
  try {
    window.localStorage.removeItem(resumeKey(lessonId, part))
  } catch {
    // Nothing to clear.
  }
}
