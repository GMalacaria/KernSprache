import { assert, assertEquals } from 'jsr:@std/assert@1'
import { CEFR_LEVELS, WRITTEN_QUESTIONS_BY_LANGUAGE, writtenQuestions } from './questions.ts'

for (const [language, questions] of Object.entries(WRITTEN_QUESTIONS_BY_LANGUAGE)) {
  Deno.test(`${language} placement bank: 16 questions, 4 per level, well formed`, () => {
    assertEquals(questions.length, 16)
    for (const level of CEFR_LEVELS) assertEquals(questions.filter((q) => q.level === level).length, 4)
    assertEquals(new Set(questions.map((q) => q.id)).size, questions.length, 'ids are unique')
    for (const q of questions) {
      assertEquals(new Set(q.options).size, 4, `${q.id}: options are distinct`)
      assert(q.prompt.includes('___'), `${q.id}: the prompt has a gap`)
      assert(q.answer >= 0 && q.answer < 4)
    }
  })

  Deno.test(`${language} placement bank: the right answer is not always in the same place`, () => {
    assert(new Set(questions.map((q) => q.answer)).size >= 3)
  })
}

Deno.test('writtenQuestions: a bank per studied language, none for Italian', () => {
  assertEquals(writtenQuestions('de'), WRITTEN_QUESTIONS_BY_LANGUAGE.de)
  assertEquals(writtenQuestions('it'), null)
})
