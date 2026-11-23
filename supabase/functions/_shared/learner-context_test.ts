import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { renderLearnerContext } from './learner-context.ts'

Deno.test('renderLearnerContext lists recurring mistake types and review words', () => {
  const text = renderLearnerContext({
    level: 'A2',
    goal: null,
    purpose: 'travel',
    topicTitle: 'Present simple (a1-present-simple)',
    recentMistakes: [
      { original: 'he go', corrected: 'he goes', category: 'verb_tense' },
      { original: 'she like', corrected: 'she likes', category: 'verb_tense' },
      { original: 'in monday', corrected: 'on Monday', category: 'preposition' },
    ],
    reviewWords: ['kitchen', 'tired'],
  })
  assertStringIncludes(text, '- Level: A2')
  assertStringIncludes(text, '- Current topic: Present simple (a1-present-simple)')
  // Only categories seen at least twice count as recurring.
  assertStringIncludes(text, '- Recurring mistake types: verb_tense (2)\n')
  assertStringIncludes(text, '"in monday" -> "on Monday" [preposition]')
  assertStringIncludes(text, '- Words in review: kitchen, tired')
  assertStringIncludes(text, '- Learning purpose: travel')
  assertEquals(text.includes("learner's own words"), false)
})

Deno.test('renderLearnerContext handles a brand-new learner', () => {
  const text = renderLearnerContext({
    level: 'A1',
    goal: 'parlare con i colleghi',
    purpose: null,
    topicTitle: null,
    recentMistakes: [],
    reviewWords: [],
  })
  assertStringIncludes(text, "- In the learner's own words: parlare con i colleghi")
  assertStringIncludes(text, '- Learning purpose: not specified')
  assertStringIncludes(text, 'none, free conversation')
  assertStringIncludes(text, 'Recurring mistake types: none yet')
  assertStringIncludes(text, 'Words in review: none')
})
