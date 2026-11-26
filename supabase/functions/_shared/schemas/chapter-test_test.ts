import { assertEquals } from 'jsr:@std/assert@1'
import { questionReview, storedQuestionSchema } from './chapter-test.ts'

Deno.test('a stored question needs its sentence and translation', () => {
  const q = storedQuestionSchema.safeParse({
    id: 'q1',
    prompt: 'She ___ a teacher.',
    options: ['a', 'b', 'c', 'd'],
    answer: 1,
  })
  assertEquals(q.success, false)
})

Deno.test('the review carries the full sentence and its translation', () => {
  const q = storedQuestionSchema.parse({
    id: 'q2',
    prompt: 'She ___ a teacher.',
    options: ['are', 'is', 'am', 'be'],
    answer: 1,
    sentence: ' She is a teacher. ',
    translation: 'Lei è un’insegnante.',
  })
  assertEquals(questionReview(q), {
    id: 'q2',
    sentence: 'She is a teacher.',
    translation: 'Lei è un’insegnante.',
  })
})
