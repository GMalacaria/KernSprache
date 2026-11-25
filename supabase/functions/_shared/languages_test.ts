import { assertEquals } from 'jsr:@std/assert@1'
import { LANGUAGE_CODES, LANGUAGE_NAMES, languageSchema, pairNames } from './languages.ts'

Deno.test('pairNames: English names for the prompts', () => {
  assertEquals(pairNames({ native: 'it', target: 'de' }), {
    native: 'Italian',
    target: 'German',
  })
})

Deno.test('every language code has a name and parses', () => {
  for (const code of LANGUAGE_CODES) {
    assertEquals(typeof LANGUAGE_NAMES[code], 'string')
    assertEquals(languageSchema.parse(code), code)
  }
  assertEquals(languageSchema.safeParse('pt').success, false)
})
