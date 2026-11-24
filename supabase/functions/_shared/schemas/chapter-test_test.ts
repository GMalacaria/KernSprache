import { assertEquals } from 'jsr:@std/assert@1'
import { questionReview, storedQuestionSchema } from './chapter-test.ts'

Deno.test('stored questions without sentence and translation (before v2) still parse', () => {
  const q = storedQuestionSchema.parse({
    id: 'q1',
    prompt: 'She ___ a teacher.',
    options: ['a', 'b', 'c', 'd'],
    answer: 1,
  })
  assertEquals(questionReview(q), {
    id: 'q1',
    sentence_en: null,
    translation_it: null,
  })
})

Deno.test('the review carries the full sentence and its translation', () => {
  const q = storedQuestionSchema.parse({
    id: 'q2',
    prompt: 'She ___ a teacher.',
    options: ['are', 'is', 'am', 'be'],
    answer: 1,
    sentence_en: ' She is a teacher. ',
    translation_it: 'Lei è un’insegnante.',
  })
  assertEquals(questionReview(q), {
    id: 'q2',
    sentence_en: 'She is a teacher.',
    translation_it: 'Lei è un’insegnante.',
  })
})
