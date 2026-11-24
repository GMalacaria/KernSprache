import { assertEquals } from 'jsr:@std/assert@1'
import { MAX_SPEAK_CHARS, speakRequestSchema } from './speak.ts'

Deno.test('speak request: trims and collapses whitespace', () => {
  const r = speakRequestSchema.safeParse({ text: '  Where   were\nyou?  ' })
  assertEquals(r.success && r.data.text, 'Where were you?')
})

Deno.test('speak request: rejects empty and overlong text', () => {
  assertEquals(speakRequestSchema.safeParse({ text: '   ' }).success, false)
  assertEquals(speakRequestSchema.safeParse({ text: 'a'.repeat(MAX_SPEAK_CHARS + 1) }).success, false)
  assertEquals(speakRequestSchema.safeParse({ text: 'a'.repeat(MAX_SPEAK_CHARS) }).success, true)
})
