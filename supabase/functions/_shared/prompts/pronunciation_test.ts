import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { PRONUNCIATION_PROMPT } from './pronunciation.v1.ts'
import { pronunciationPrompt } from './pronunciation.v2.ts'
import { pronunciationPrompt as pronunciationPromptV3, SILENCE_RULE } from './pronunciation.v3.ts'

Deno.test('pronunciationPrompt: without a sentence it is the free-speech prompt', () => {
  assertEquals(pronunciationPrompt(), PRONUNCIATION_PROMPT)
  assertEquals(pronunciationPrompt(undefined), PRONUNCIATION_PROMPT)
})

Deno.test('pronunciationPrompt: with a sentence it asks to judge against it, quoted safely', () => {
  const prompt = pronunciationPrompt('Say "hello" to her')
  assertStringIncludes(prompt, PRONUNCIATION_PROMPT)
  assertStringIncludes(prompt, '"Say \\"hello\\" to her"')
  assertStringIncludes(prompt, 'against that sentence')
})

Deno.test('pronunciationPrompt v3: silence gets no transcript and no grade, with or without a sentence', () => {
  for (const prompt of [pronunciationPromptV3(), pronunciationPromptV3('I was at the hotel.')]) {
    assertStringIncludes(prompt, SILENCE_RULE)
    assertStringIncludes(prompt, 'pronunciation MUST be null')
    assertStringIncludes(prompt, 'never copy or complete the expected sentence')
  }
  // The sentence to read is still there, and the silence rule comes after it so it wins.
  const withSentence = pronunciationPromptV3('I was at the hotel.')
  assertStringIncludes(withSentence, '"I was at the hotel."')
  assertEquals(withSentence.indexOf(SILENCE_RULE) > withSentence.indexOf('against that sentence'), true)
})
