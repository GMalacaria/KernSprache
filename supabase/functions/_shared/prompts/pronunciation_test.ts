import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { PRONUNCIATION_PROMPT } from './pronunciation.v1.ts'
import { pronunciationPrompt } from './pronunciation.v2.ts'

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
