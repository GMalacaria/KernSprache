import { assert, assertEquals } from 'jsr:@std/assert@1'
import { BANK_SKILLS, type BankSkill, PLACEMENT_BANKS, placementBank, VOCAB_DOMAINS } from './bank.ts'
import { CEFR_LEVELS } from './questions.ts'

/** Questions per level and skill: the adaptive engine needs enough to confirm a level and to verify the one below. */
const QUESTIONS_PER_LEVEL: Record<BankSkill, number> = { grammar: 6, vocabulary: 6, reading: 4, listening: 4 }
const PASSAGES_PER_LEVEL = 2
const QUESTIONS_PER_PASSAGE = 2
/** The `speak` function accepts at most 600 characters. */
const MAX_LISTENING_CHARS = 600

/** Lesson slugs per chapter slug, read from the curriculum migrations. */
async function curriculumLessons(): Promise<Set<string>> {
  const dir = new URL('../../../migrations/', import.meta.url)
  const lessons = new Set<string>()
  for await (const entry of Deno.readDir(dir)) {
    if (!entry.name.endsWith('.sql')) continue
    const sql = await Deno.readTextFile(new URL(entry.name, dir))
    for (const match of sql.matchAll(/\('([a-z0-9-]+)', \d+, '([a-z0-9-]+)'/g)) lessons.add(`${match[1]}/${match[2]}`)
  }
  return lessons
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[.!?]+$/, '')
}

for (const [language, bank] of Object.entries(PLACEMENT_BANKS)) {
  const { questions, passages, grammarTopics } = bank

  Deno.test(`${language} placement bank: questions per level and skill`, () => {
    for (const skill of BANK_SKILLS) {
      for (const level of CEFR_LEVELS) {
        const count = questions.filter((q) => q.skill === skill && q.level === level).length
        assertEquals(count, QUESTIONS_PER_LEVEL[skill], `${skill} ${level}`)
      }
    }
  })

  Deno.test(`${language} placement bank: ids are unique`, () => {
    const ids = [...questions.map((q) => q.id), ...passages.map((p) => p.id)]
    assertEquals(new Set(ids).size, ids.length)
  })

  Deno.test(`${language} placement bank: questions are well formed`, () => {
    for (const q of questions) {
      assertEquals(new Set(q.options).size, 4, `${q.id}: options are distinct`)
      assert(q.answer >= 0 && q.answer < 4, `${q.id}: answer in range`)
      assert(q.sentence.trim() && q.translation.trim(), `${q.id}: sentence and translation`)
      if (q.skill === 'grammar' || q.skill === 'vocabulary') {
        assert(q.prompt.includes('___'), `${q.id}: the prompt has a gap`)
        assertEquals(q.passage, undefined, `${q.id}: no passage`)
        assertEquals(q.sentence, q.prompt.replace('___', q.options[q.answer]), `${q.id}: sentence fills the gap`)
      } else {
        assert(!q.prompt.includes('___'), `${q.id}: a question, not a gap`)
      }
    }
  })

  Deno.test(`${language} placement bank: the right answer is spread across positions`, () => {
    for (const position of [0, 1, 2, 3]) {
      const share = questions.filter((q) => q.answer === position).length / questions.length
      assert(share >= 0.15 && share <= 0.35, `answer ${position}: ${Math.round(share * 100)}%`)
    }
  })

  Deno.test(`${language} placement bank: grammar topics match the question level`, () => {
    for (const q of questions.filter((q) => q.skill === 'grammar')) {
      const topic = grammarTopics[q.topic]
      assert(topic, `${q.id}: unknown grammar topic ${q.topic}`)
      assertEquals(q.level, topic.level, `${q.id}: same level as its topic`)
    }
  })

  Deno.test(`${language} placement bank: other topics are vocabulary domains`, () => {
    const domains: readonly string[] = VOCAB_DOMAINS
    for (const q of questions.filter((q) => q.skill !== 'grammar')) {
      assert(domains.includes(q.topic), `${q.id}: unknown domain ${q.topic}`)
    }
  })

  Deno.test(`${language} placement bank: every grammar topic has a lesson in the curriculum`, async () => {
    const lessons = await curriculumLessons()
    for (const [id, topic] of Object.entries(grammarTopics)) {
      assert(lessons.has(`${topic.chapter}/${topic.lesson}`), `${id}: ${topic.chapter}/${topic.lesson} not found`)
      assert(topic.chapter.startsWith(topic.level.toLowerCase()), `${id}: chapter of level ${topic.level}`)
    }
  })

  Deno.test(`${language} placement bank: passages and their questions`, () => {
    for (const skill of ['reading', 'listening'] as const) {
      for (const level of CEFR_LEVELS) {
        assertEquals(passages.filter((p) => p.skill === skill && p.level === level).length, PASSAGES_PER_LEVEL)
      }
    }
    for (const p of passages) {
      const about = questions.filter((q) => q.passage === p.id)
      assertEquals(about.length, QUESTIONS_PER_PASSAGE, `${p.id}: questions`)
      for (const q of about) {
        assertEquals([q.skill, q.level, q.topic], [p.skill, p.level, p.topic], `${q.id}: same as the passage`)
        assert(normalise(p.text).includes(normalise(q.sentence)), `${q.id}: the sentence is a line of the passage`)
      }
      if (p.skill === 'listening') assert(p.text.length <= MAX_LISTENING_CHARS, `${p.id}: ${p.text.length} chars`)
    }
    for (const q of questions.filter((q) => q.skill === 'reading' || q.skill === 'listening')) {
      assert(passages.some((p) => p.id === q.passage), `${q.id}: passage exists`)
    }
  })
}

Deno.test('placementBank: English has one, the other languages keep the fixed test', () => {
  assertEquals(placementBank('en'), PLACEMENT_BANKS.en)
  assertEquals(placementBank('de'), null)
  assertEquals(placementBank('it'), null)
})
