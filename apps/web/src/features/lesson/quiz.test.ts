import { describe, expect, it } from 'vitest'
import { comprehensionQuiz, lessonScore, makeQuestion, phraseQuiz, shuffle, verbQuiz, wordQuiz } from './quiz'
import type { LessonContent } from './types'

const content: LessonContent = {
  intro_it: 'x',
  grammar: { explanation_it: 'x', examples: [{ en: 'I am', it: 'io sono' }] },
  words: [
    { en: 'tourist', it: 'turista', example_en: '' },
    { en: 'hotel', it: 'albergo', example_en: '' },
    { en: 'passport', it: 'passaporto', example_en: '' },
    { en: 'city', it: 'città', example_en: '' },
    { en: 'summer', it: 'estate', example_en: '' },
  ],
  phrases: [
    { en: 'Nice to meet you.', it: 'Piacere di conoscerti.' },
    { en: 'Welcome!', it: 'Benvenuto!' },
    { en: 'Here you are.', it: 'Ecco a te.' },
  ],
  idioms: [{ en: 'safe and sound', it: 'sano e salvo', meaning_it: 'arrivato senza problemi' }],
  verbs: [
    { base: 'meet', past: 'met', past_participle: 'met', it: 'incontrare' },
    { base: 'arrive', past: 'arrived', past_participle: 'arrived', it: 'arrivare' },
    { base: 'go', past: 'went', past_participle: 'gone', it: 'andare' },
  ],
  listening: { text_en: 'x', questions: [{ question_it: 'Chi?', options: ['a', 'b', 'c', 'd'], answer: 2 }] },
  reading: { title_en: 'x', text_en: 'x', questions: [{ question_it: 'Dove?', options: ['a', 'b'], answer: 5 }] },
  dialogue: { scenario_it: 'x', opening_en: 'Hi!' },
}

const correctOption = (q: { options: string[]; answer: number }) => q.options[q.answer]

describe('quiz builders', () => {
  it('shuffle is deterministic and keeps every item', () => {
    expect(shuffle([1, 2, 3, 4], 5)).toEqual(shuffle([1, 2, 3, 4], 5))
    expect([...shuffle([1, 2, 3, 4], 5)].sort()).toEqual([1, 2, 3, 4])
  })

  it('makeQuestion keeps the correct answer among at most 4 unique options', () => {
    const q = makeQuestion('?', 'went', ['goed', 'go', 'gone', 'went', 'met'], 3)
    expect(q.options).toHaveLength(4)
    expect(new Set(q.options).size).toBe(4)
    expect(correctOption(q)).toBe('went')
  })

  it('asks one translation per word with English options', () => {
    const qs = wordQuiz(content)
    expect(qs).toHaveLength(5)
    expect(qs.map(correctOption)).toEqual(['tourist', 'hotel', 'passport', 'city', 'summer'])
    expect(qs.every((q) => q.options.length === 4 && q.optionsLang === 'en')).toBe(true)
  })

  it('asks the past simple with the typical -ed mistake as a distractor', () => {
    const [, arrive, go] = verbQuiz(content)
    expect(go && correctOption(go)).toBe('went')
    expect(go?.options).toContain('goed')
    // A regular verb: "arrived" must not appear twice as the "-ed mistake".
    expect(arrive?.options.filter((o) => o === 'arrived')).toHaveLength(1)
  })

  it('asks the meaning of a phrase and of each idiom', () => {
    const qs = phraseQuiz(content)
    expect(qs.map(correctOption)).toEqual(['Piacere di conoscerti.', 'arrivato senza problemi'])
  })

  it('drops comprehension questions with an invalid answer index', () => {
    expect(comprehensionQuiz(content.listening.questions)).toHaveLength(1)
    expect(comprehensionQuiz(content.reading.questions)).toHaveLength(0)
  })

  it('computes the lesson score', () => {
    expect(lessonScore(7, 10)).toBe(70)
    expect(lessonScore(0, 0)).toBe(100)
  })
})
