import { describe, expect, it } from 'vitest'
import { compareDictation, dictationScore, dictationSentences, normalizeWords } from './dictation'
import type { LessonContent } from './types'

describe('normalizeWords', () => {
  it('lowercases and drops punctuation but keeps apostrophes inside words', () => {
    expect(normalizeWords("Where were you, I'm sure?")).toEqual(['where', 'were', 'you', "i'm", 'sure'])
    expect(normalizeWords('It’s great!')).toEqual(["it's", 'great'])
  })
})

describe('compareDictation', () => {
  const target = 'I was at home yesterday.'

  it('accepts the right sentence ignoring case and punctuation', () => {
    expect(compareDictation(target, 'i was at home yesterday').correct).toBe(true)
    expect(compareDictation(target, '  I  WAS at home, yesterday!  ').correct).toBe(true)
  })

  it('marks a wrong word and keeps the rest right', () => {
    const r = compareDictation(target, 'I were at home yesterday')
    expect(r.correct).toBe(false)
    expect(r.words.map((w) => w.ok)).toEqual([true, false, true, true, true])
    expect(r.missing).toBe(1)
  })

  it('counts missing words and does not mark the words after the gap wrong', () => {
    const r = compareDictation(target, 'I was home yesterday')
    expect(r.words.every((w) => w.ok)).toBe(true)
    expect(r.missing).toBe(1)
    expect(r.correct).toBe(false)
  })

  it('marks an extra word wrong', () => {
    const r = compareDictation(target, 'I was at the home yesterday')
    expect(r.words.map((w) => w.ok)).toEqual([true, true, true, false, true, true])
    expect(r.missing).toBe(0)
    expect(r.correct).toBe(false)
  })

  it('treats an empty attempt as wrong', () => {
    const r = compareDictation(target, '   ')
    expect(r.correct).toBe(false)
    expect(r.missing).toBe(5)
  })
})

describe('dictationScore', () => {
  it('takes points off for wrong attempts and for the shown text, never below zero', () => {
    expect(dictationScore(0, false)).toBe(100)
    expect(dictationScore(2, false)).toBe(60)
    expect(dictationScore(0, true)).toBe(70)
    expect(dictationScore(2, true)).toBe(30)
    expect(dictationScore(9, true)).toBe(0)
  })
})

describe('dictationSentences', () => {
  const content = {
    phrases: [
      { text: 'Hi!', translation: 'Ciao!' },
      { text: 'Where were you?', translation: "Dov'eri?" },
      { text: 'I was at work.', translation: 'Ero al lavoro.' },
    ],
    grammar: {
      explanation: '',
      examples: [
        { text: 'Where were you?', translation: 'duplicate' },
        { text: 'They were tired after the long trip to the mountains last week with all of us.', translation: 'too long' },
        { text: 'It was great!', translation: 'Era fantastico!' },
        { text: 'We were late for the train.', translation: 'Eravamo in ritardo.' },
      ],
    },
  } as unknown as LessonContent

  it('skips too short, too long and repeated sentences and stops at three', () => {
    expect(dictationSentences(content).map((s) => s.text)).toEqual([
      'Where were you?',
      'I was at work.',
      'It was great!',
    ])
  })
})

describe('dictation in other languages', () => {
  it('keeps accents, ñ, ü, ß and ç', () => {
    expect(normalizeWords('Der Fuß ist groß, ÜBER alles!')).toEqual(['der', 'fuß', 'ist', 'groß', 'über', 'alles'])
    expect(normalizeWords('El niño está en España.')).toEqual(['el', 'niño', 'está', 'en', 'españa'])
    expect(normalizeWords('Ça va, garçon ?')).toEqual(['ça', 'va', 'garçon'])
  })

  it('drops ¿ ¡ « » around words and keeps the French apostrophe', () => {
    expect(normalizeWords('¿Dónde estás? ¡Hola!')).toEqual(['dónde', 'estás', 'hola'])
    expect(normalizeWords("« J'ai vu l’homme »")).toEqual(["j'ai", 'vu', "l'homme"])
  })

  it('treats a decomposed accent like the composed one', () => {
    const decomposed = 'café'
    expect(compareDictation('Un café, por favor.', `un ${decomposed} por favor`).correct).toBe(true)
  })

  it('marks a missing accent as a mistake', () => {
    const result = compareDictation('Él está aquí.', 'El esta aquí')
    expect(result.correct).toBe(false)
    expect(result.words.map((w) => w.ok)).toEqual([false, false, true])
  })
})
