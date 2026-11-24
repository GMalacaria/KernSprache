import { assertEquals } from 'jsr:@std/assert@1'
import { reviewCheckRequestSchema } from './review-check.ts'

Deno.test('review check request: trims fields and defaults spoken to false', () => {
  const r = reviewCheckRequestSchema.safeParse({
    kind: 'translation',
    prompt: ' house ',
    expected: 'casa',
    answer: ' abitazione ',
  })
  assertEquals(r.success && r.data, {
    kind: 'translation',
    prompt: 'house',
    expected: 'casa',
    answer: 'abitazione',
    spoken: false,
  })
})

Deno.test('review check request: rejects empty answers, unknown kinds and overlong text', () => {
  const base = {
    kind: 'correction',
    prompt: 'I has a dog',
    expected: 'I have a dog',
    answer: 'I have a dog',
  }
  assertEquals(
    reviewCheckRequestSchema.safeParse({ ...base, answer: '  ' }).success,
    false,
  )
  assertEquals(
    reviewCheckRequestSchema.safeParse({ ...base, kind: 'other' }).success,
    false,
  )
  assertEquals(
    reviewCheckRequestSchema.safeParse({ ...base, answer: 'a'.repeat(301) })
      .success,
    false,
  )
  assertEquals(reviewCheckRequestSchema.safeParse(base).success, true)
})
