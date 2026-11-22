import { assertEquals } from 'jsr:@std/assert@1'
import { cleanTranscript } from './transcriber.ts'

Deno.test('cleanTranscript trims quotes and whitespace', () => {
  assertEquals(cleanTranscript('  "I go to school yesterday."\n'), 'I go to school yesterday.')
})

Deno.test('cleanTranscript maps the no-speech marker and empty output to an empty string', () => {
  assertEquals(cleanTranscript('[no speech]'), '')
  assertEquals(cleanTranscript('[No speech] '), '')
  assertEquals(cleanTranscript(undefined), '')
})
