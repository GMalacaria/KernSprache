import { assertEquals } from 'jsr:@std/assert@1'
import { tutorChatRequestSchema, tutorReplySchema } from './tutor-chat.ts'

Deno.test('request must end with a user message', () => {
  const ok = tutorChatRequestSchema.safeParse({ messages: [{ role: 'user', content: 'Hi' }] })
  const bad = tutorChatRequestSchema.safeParse({
    messages: [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ],
  })
  assertEquals(ok.success, true)
  assertEquals(bad.success, false)
})

Deno.test('reply schema rejects unknown categories', () => {
  const r = tutorReplySchema.safeParse({
    reply: 'Hi',
    corrections: [{ original: 'a', corrected: 'b', explanation: 'c', category: 'grammar' }],
    new_vocab: [],
  })
  assertEquals(r.success, false)
})
