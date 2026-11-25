import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { pairNames } from '../languages.ts'
import { chapterTestOralPrompt, chapterTestPrompt } from './chapter-test.v3.ts'
import { lessonPrompt } from './lesson.v2.ts'
import { placementOralPrompt } from './placement-oral.v2.ts'
import { reviewCheckPrompt } from './review-check.v2.ts'
import { pronunciationPrompt, transcribePrompt } from './transcribe.v2.ts'
import { tutorChatPrompt } from './tutor-chat.v3.ts'

const german = pairNames({ native: 'it', target: 'de' })
const english = pairNames({ native: 'it', target: 'en' })

const prompts: [string, (n: typeof german) => string][] = [
  ['tutor-chat', tutorChatPrompt],
  ['review-check', reviewCheckPrompt],
  ['lesson', lessonPrompt],
  ['chapter-test', chapterTestPrompt],
  ['chapter-test-oral', chapterTestOralPrompt],
  ['placement-oral', placementOralPrompt],
  ['transcribe', transcribePrompt],
  ['pronunciation', (n) => pronunciationPrompt(n)],
]

for (const [name, prompt] of prompts) {
  Deno.test(`${name}: names the studied and the native language`, () => {
    const text = prompt(german)
    assertStringIncludes(text, 'German')
    assertStringIncludes(text, 'Italian')
  })

  Deno.test(`${name}: the fixed text depends only on the pair (stable prefix for caching)`, () => {
    assertEquals(prompt(german), prompt(german))
    assert(prompt(german) !== prompt(english))
  })
}

// The lesson prompt lists English verb forms as one example among others; every other prompt is English-free
// when the pair does not involve English.
for (const [name, prompt] of prompts.filter(([n]) => n !== 'lesson')) {
  Deno.test(`${name}: no English left for an Italian learner of German`, () => {
    assert(
      !prompt(german).includes('English'),
      `${name} still mentions English`,
    )
  })
}

Deno.test('pronunciation: a known sentence is quoted safely and judged against', () => {
  const text = pronunciationPrompt(german, 'Sag "hallo"')
  assertStringIncludes(text, '"Sag \\"hallo\\""')
  assertStringIncludes(text, 'against that sentence')
})

Deno.test('pronunciation: keeps the silence rule, with and without a known sentence', () => {
  assertStringIncludes(pronunciationPrompt(german), 'Silence and noise')
  assertStringIncludes(pronunciationPrompt(german, 'Hallo'), 'Silence and noise')
})
