import { assertEquals } from 'jsr:@std/assert@1'
import { WRITTEN_QUESTIONS } from './questions.ts'
import { combineLevels, scoreWritten } from './scoring.ts'

const allCorrect = Object.fromEntries(WRITTEN_QUESTIONS.map((q) => [q.id, q.answer]))
const correctUpTo = (levels: string[]) =>
  Object.fromEntries(WRITTEN_QUESTIONS.filter((q) => levels.includes(q.level)).map((q) => [q.id, q.answer]))

Deno.test('the bank has 4 questions per level with valid answers and unique ids', () => {
  assertEquals(WRITTEN_QUESTIONS.length, 16)
  assertEquals(new Set(WRITTEN_QUESTIONS.map((q) => q.id)).size, 16)
  for (const level of ['A1', 'A2', 'B1', 'B2']) {
    assertEquals(WRITTEN_QUESTIONS.filter((q) => q.level === level).length, 4)
  }
})

Deno.test('scoreWritten gives the highest level passed in sequence', () => {
  assertEquals(scoreWritten(allCorrect).level, 'B2')
  assertEquals(scoreWritten(allCorrect).correct, 16)
  assertEquals(scoreWritten(correctUpTo(['A1', 'A2'])).level, 'A2')
  assertEquals(scoreWritten({}).level, 'A1')
})

Deno.test('a passed higher level does not count if a lower one failed', () => {
  assertEquals(scoreWritten(correctUpTo(['A1', 'B1', 'B2'])).level, 'A1')
})

Deno.test('3 out of 4 is enough to pass a level', () => {
  const answers = correctUpTo(['A1', 'A2'])
  delete answers['a2-much-many']
  const result = scoreWritten(answers)
  assertEquals(result.byLevel.A2, { correct: 3, total: 4 })
  assertEquals(result.level, 'A2')
})

Deno.test('combineLevels rounds down and ignores a missing oral part', () => {
  assertEquals(combineLevels('B1', 'A2'), 'A2')
  assertEquals(combineLevels('B2', 'A2'), 'B1')
  assertEquals(combineLevels('A2', 'A2'), 'A2')
  assertEquals(combineLevels('B1', null), 'B1')
})
