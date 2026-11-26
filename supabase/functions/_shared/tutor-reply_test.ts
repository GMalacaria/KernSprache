import { assertEquals } from 'jsr:@std/assert@1'
import { cleanReply } from './tutor-reply.ts'

Deno.test('cleanReply drops no-op corrections and normalises vocabulary', () => {
  const result = cleanReply(
    {
      reply: '  Nice! What do you do?  ',
      corrections: [
        { original: 'I has', corrected: 'I have', explanation: 'Con "I" si usa "have".', category: 'verb_tense' },
        { original: 'dog', corrected: 'dog', explanation: 'x', category: 'other' },
        { original: ' ', corrected: 'a', explanation: 'x', category: 'article' },
      ],
      new_vocab: [
        { term: ' Job ', translation: 'lavoro' },
        { term: 'job', translation: 'impiego' },
        { term: 'dog', translation: 'cane' },
        { term: 'kitchen', translation: '' },
      ],
    },
    new Set(['dog']),
  )
  assertEquals(result.reply, 'Nice! What do you do?')
  assertEquals(result.corrections.map((c) => c.original), ['I has'])
  assertEquals(result.new_vocab, [{ term: 'job', translation: 'lavoro' }])
})

Deno.test('cleanReply keeps the case of German nouns, still de-duplicating case-insensitively', () => {
  const result = cleanReply(
    {
      reply: 'Schön!',
      corrections: [],
      new_vocab: [
        { term: ' der Kinobesuch ', translation: 'la visita al cinema' },
        { term: 'der kinobesuch', translation: 'doppione' },
        { term: 'Der Film', translation: 'il film' },
      ],
    },
    new Set(['der film']),
    true,
  )
  assertEquals(result.new_vocab, [{ term: 'der Kinobesuch', translation: 'la visita al cinema' }])
})
