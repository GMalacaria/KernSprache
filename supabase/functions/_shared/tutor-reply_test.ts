import { assertEquals } from 'jsr:@std/assert@1'
import { cleanReply } from './tutor-reply.ts'

Deno.test('cleanReply drops no-op corrections and normalises vocabulary', () => {
  const result = cleanReply(
    {
      reply: '  Nice! What do you do?  ',
      corrections: [
        { original: 'I has', corrected: 'I have', explanation_it: 'Con "I" si usa "have".', category: 'verb_tense' },
        { original: 'dog', corrected: 'dog', explanation_it: 'x', category: 'other' },
        { original: ' ', corrected: 'a', explanation_it: 'x', category: 'article' },
      ],
      new_vocab: [
        { en: ' Job ', it: 'lavoro' },
        { en: 'job', it: 'impiego' },
        { en: 'dog', it: 'cane' },
        { en: 'kitchen', it: '' },
      ],
    },
    new Set(['dog']),
  )
  assertEquals(result.reply, 'Nice! What do you do?')
  assertEquals(result.corrections.map((c) => c.original), ['I has'])
  assertEquals(result.new_vocab, [{ en: 'job', it: 'lavoro' }])
})
