import { describe, expect, it } from 'vitest'
import { comprehensionQuiz, lessonScore, makeQuestion, phraseQuiz, shuffle, verbQuiz, wordQuiz } from './quiz'
import type { LessonContent } from './types'

const content: LessonContent = {
  intro: 'x',
  grammar: { explanation: 'x', examples: [{ text: 'I am', translation: 'io sono' }] },
  words: [
    { term: 'tourist', translation: 'turista', example: '' },
    { term: 'hotel', translation: 'albergo', example: '' },
    { term: 'passport', translation: 'passaporto', example: '' },
    { term: 'city', translation: 'città', example: '' },
    { term: 'summer', translation: 'estate', example: '' },
  ],
  phrases: [
    { text: 'Nice to meet you.', translation: 'Piacere di conoscerti.' },
    { text: 'Welcome!', translation: 'Benvenuto!' },
    { text: 'Here you are.', translation: 'Ecco a te.' },
  ],
  idioms: [{ text: 'safe and sound', literal: 'sano e salvo', meaning: 'arrivato senza problemi' }],
  verbs: [
    { forms: ['meet', 'met', 'met'], translation: 'incontrare' },
    { forms: ['arrive', 'arrived', 'arrived'], translation: 'arrivare' },
    { forms: ['go', 'went', 'gone'], translation: 'andare' },
  ],
  listening: { text: 'x', questions: [{ question: 'Chi?', options: ['a', 'b', 'c', 'd'], answer: 2 }] },
  reading: { title: 'x', text: 'x', questions: [{ question: 'Dove?', options: ['a', 'b'], answer: 5 }] },
  dialogue: { scenario: 'x', opening: 'Hi!' },
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

  it('asks one translation per word with options in the studied language', () => {
    const qs = wordQuiz(content)
    expect(qs).toHaveLength(5)
    expect(qs.map(correctOption)).toEqual(['tourist', 'hotel', 'passport', 'city', 'summer'])
    expect(qs.every((q) => q.options.length === 4 && q.optionsLang === 'en')).toBe(true)
  })

  it('asks the second form of each verb, with the other forms around the gap', () => {
    const [meet, , go] = verbQuiz(content)
    expect(go && correctOption(go)).toBe('went')
    expect(go?.prompt).toContain('go · ___ · gone')
    expect(go?.prompt).toContain('andare')
    expect(go?.options).toContain('gone')
    // "met" is both the second and the third form: it appears once, as the right answer.
    expect(meet?.options.filter((o) => o === 'met')).toHaveLength(1)
  })

  it('skips verbs with a single form', () => {
    expect(verbQuiz({ ...content, verbs: [{ forms: ['être'], translation: 'essere' }] })).toEqual([])
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
