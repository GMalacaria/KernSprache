import { assertEquals } from 'jsr:@std/assert@1'
import { tutorReplySchema } from '../schemas/tutor-chat.ts'
import { toResponseSchema, toTokenUsage } from './gemini.ts'

Deno.test('toTokenUsage separates cached input and counts thinking as output', () => {
  assertEquals(
    toTokenUsage({
      promptTokenCount: 1200,
      cachedContentTokenCount: 1000,
      candidatesTokenCount: 80,
      thoughtsTokenCount: 40,
    }),
    { inputTokens: 200, outputTokens: 120, cacheCreationInputTokens: 0, cacheReadInputTokens: 1000 },
  )
  assertEquals(toTokenUsage(undefined), {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  })
})

Deno.test('toResponseSchema produces a plain JSON schema for the tutor reply', () => {
  const schema = toResponseSchema(tutorReplySchema)
  assertEquals('$schema' in schema, false)
  assertEquals(schema.type, 'object')
  assertEquals(schema.required, ['reply', 'corrections', 'new_vocab'])
})
