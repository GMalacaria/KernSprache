import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearResume,
  combineStats,
  initialPart,
  loadResume,
  parseStats,
  partDone,
  repeatSentences,
  saveResume,
  statsScore,
  type LessonProgressRow,
} from './parts'
import type { LessonContent } from './types'

const row = (written: boolean, oral: boolean): LessonProgressRow => ({
  written_done_at: written ? '2026-11-25T10:00:00Z' : null,
  oral_done_at: oral ? '2026-11-25T11:00:00Z' : null,
  written_stats: null,
  oral_stats: null,
  completed_at: written && oral ? '2026-11-25T11:00:00Z' : null,
})

describe('initialPart', () => {
  it('opens the part still to do', () => {
    expect(initialPart(row(true, false), 'written')).toBe('oral')
    expect(initialPart(row(false, true), 'oral')).toBe('written')
  })
  it('follows the daily timer when nothing is done yet', () => {
    expect(initialPart(null, 'oral')).toBe('oral')
    expect(initialPart(row(false, false), 'written')).toBe('written')
  })
  it('opens a completed lesson on the written part', () => {
    expect(initialPart(row(true, true), 'oral')).toBe('written')
  })
})

describe('partDone', () => {
  it('reads each part from its own column', () => {
    expect(partDone(row(true, false), 'written')).toBe(true)
    expect(partDone(row(true, false), 'oral')).toBe(false)
    expect(partDone(undefined, 'written')).toBe(false)
  })
})

describe('stats', () => {
  it('parses saved stats and rejects malformed ones', () => {
    expect(parseStats({ answers: 10, correct: 8, best_streak: 5 })).toEqual({ answers: 10, correct: 8, best_streak: 5 })
    expect(parseStats({ answers: 2, correct: 3, best_streak: 1 })).toEqual({ answers: 0, correct: 0, best_streak: 0 })
    expect(parseStats(null)).toEqual({ answers: 0, correct: 0, best_streak: 0 })
    expect(parseStats({ answers: 4, correct: 2, best_streak: 9 }).best_streak).toBe(2)
  })
  it('adds the answers of both parts and keeps the longest run', () => {
    const both = combineStats({ answers: 20, correct: 16, best_streak: 7 }, { answers: 5, correct: 4, best_streak: 4 })
    expect(both).toEqual({ answers: 25, correct: 20, best_streak: 7 })
    expect(statsScore(both)).toBe(80)
  })
})

const content: LessonContent = {
  intro_it: 'x',
  grammar: {
    explanation_it: 'x',
    examples: [
      { en: 'Nice to meet you, Anna.', it: 'Piacere, Anna.' },
      { en: 'I am from Rome.', it: 'Sono di Roma.' },
      { en: 'She is a teacher.', it: 'Lei è insegnante.' },
    ],
  },
  words: [
    { en: 'hotel', it: 'albergo', example_en: 'The hotel is near the station.' },
    { en: 'city', it: 'città', example_en: '' },
    { en: 'summer', it: 'estate', example_en: 'We go to the sea in summer.' },
  ],
  phrases: [
    { en: 'Nice to meet you, Anna.', it: 'Piacere di conoscerti, Anna.' },
    { en: 'Where are you from?', it: 'Di dove sei?' },
  ],
  idioms: [],
  verbs: [],
  listening: { text_en: 'x', questions: [] },
  reading: { title_en: 'x', text_en: 'x', questions: [] },
  dialogue: { scenario_it: 'x', opening_en: 'Hi!' },
}

describe('repeatSentences', () => {
  it('picks up to three sentences that the dictation does not use', () => {
    const picked = repeatSentences(content).map((s) => s.en)
    // The dictation takes the phrases first and then the grammar examples (up to three).
    expect(picked).not.toContain('Nice to meet you, Anna.')
    expect(picked).not.toContain('Where are you from?')
    expect(picked).toHaveLength(3)
    expect(picked).toContain('The hotel is near the station.')
    expect(picked).not.toContain('')
  })
})

describe('resume', () => {
  // The tests run without a DOM: a small in-memory localStorage is enough.
  beforeEach(() => {
    const items = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => items.get(k) ?? null,
        setItem: (k: string, v: string) => void items.set(k, v),
        removeItem: (k: string) => void items.delete(k),
      },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps where the learner was in a part, per lesson and part', () => {
    saveResume(7, 'written', { sectionIndex: 3, tally: { answered: 6, correct: 5, streak: 2, bestStreak: 4 } })
    expect(loadResume(7, 'written')).toEqual({ sectionIndex: 3, tally: { answered: 6, correct: 5, streak: 2, bestStreak: 4 } })
    expect(loadResume(7, 'oral').sectionIndex).toBe(0)
    expect(loadResume(8, 'written').sectionIndex).toBe(0)
    clearResume(7, 'written')
    expect(loadResume(7, 'written').sectionIndex).toBe(0)
  })

  it('ignores damaged data', () => {
    window.localStorage.setItem('kernsprache.lesson.7.oral', '{"sectionIndex":-1}')
    expect(loadResume(7, 'oral').sectionIndex).toBe(0)
    window.localStorage.setItem('kernsprache.lesson.7.oral', 'not json')
    expect(loadResume(7, 'oral').sectionIndex).toBe(0)
  })
})
