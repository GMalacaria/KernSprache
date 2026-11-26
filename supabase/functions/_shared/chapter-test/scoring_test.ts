import { assertEquals } from 'jsr:@std/assert@1'
import { combineScores, levelAfterPass, PASS_SCORE, scoreOral, scoreWritten } from './scoring.ts'

const questions = [0, 1, 2, 3].map((i) => ({
  id: `q${i}`,
  prompt: 'x',
  options: ['a', 'b', 'c', 'd'],
  answer: i,
  sentence: 'x',
  translation: 'x',
}))

Deno.test('scoreWritten: percentage and wrong answers', () => {
  const r = scoreWritten(questions, { q0: 0, q1: 2, q2: 2 })
  assertEquals(r.correct, 2)
  assertEquals(r.score, 50)
  assertEquals(r.wrong, [
    { id: 'q1', chosen: 2, answer: 1 },
    { id: 'q3', chosen: null, answer: 3 },
  ])
})

Deno.test('scoreOral: mean, missing task counts as 0', () => {
  const tasks = [{ id: 'o1', prompt: 'x' }, { id: 'o2', prompt: 'y' }]
  assertEquals(scoreOral(tasks, [{ id: 'o1', score: 80 }, { id: 'o2', score: 61 }]), 71)
  assertEquals(scoreOral(tasks, [{ id: 'o1', score: 90 }]), 45)
})

Deno.test('combineScores: pass threshold is inclusive', () => {
  assertEquals(PASS_SCORE, 70)
  assertEquals(combineScores(70, 70), { score: 70, passed: true })
  assertEquals(combineScores(75, 64), { score: 70, passed: true })
  assertEquals(combineScores(75, 63), { score: 69, passed: false })
  assertEquals(combineScores(100, 0), { score: 50, passed: false })
})

Deno.test('levelAfterPass: moves up only after the last chapter of the level', () => {
  assertEquals(levelAfterPass('A1', 'A1', false), 'A1')
  assertEquals(levelAfterPass('A1', 'A1', true), 'A2')
  assertEquals(levelAfterPass('B1', 'A1', true), 'B1')
  assertEquals(levelAfterPass('B2', 'B2', true), 'B2')
  // A chapter passed ahead of the path lifts the learner to its level.
  assertEquals(levelAfterPass('A1', 'B1', false), 'B1')
  assertEquals(levelAfterPass('A1', 'B1', true), 'B2')
})
