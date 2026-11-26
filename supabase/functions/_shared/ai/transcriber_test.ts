import { assertEquals } from 'jsr:@std/assert@1'
import { cleanTranscript, parseAssessment } from './transcriber.ts'

Deno.test('cleanTranscript trims quotes and whitespace', () => {
  assertEquals(
    cleanTranscript('  "I go to school yesterday."\n'),
    'I go to school yesterday.',
  )
})

Deno.test('cleanTranscript maps the no-speech marker and empty output to an empty string', () => {
  assertEquals(cleanTranscript('[no speech]'), '')
  assertEquals(cleanTranscript('[No speech] '), '')
  assertEquals(cleanTranscript(undefined), '')
})

const assessed = (pronunciation: unknown, transcript = 'I think it is good.') =>
  JSON.stringify({ transcript, pronunciation })

Deno.test('parseAssessment: transcript and pronunciation from valid JSON', () => {
  const pronunciation = {
    score: 72,
    words: [{ word: 'think', tip: 'Metti la lingua tra i denti.' }],
    feedback: 'Chiaro.',
  }
  assertEquals(parseAssessment(assessed(pronunciation)), {
    text: 'I think it is good.',
    pronunciation,
  })
})

Deno.test('parseAssessment: accepts JSON in a markdown fence', () => {
  assertEquals(parseAssessment('```json\n' + assessed(null) + '\n```'), {
    text: 'I think it is good.',
    pronunciation: null,
  })
})

Deno.test('parseAssessment: no speech drops the score', () => {
  const pronunciation = { score: 80, words: [], feedback: 'x' }
  assertEquals(parseAssessment(assessed(pronunciation, '')), {
    text: '',
    pronunciation: null,
  })
})

Deno.test('parseAssessment: invalid or out-of-range output is rejected', () => {
  assertEquals(parseAssessment('not json'), null)
  assertEquals(parseAssessment(undefined), null)
  assertEquals(
    parseAssessment(assessed({ score: 140, words: [], feedback: 'x' })),
    null,
  )
  assertEquals(
    parseAssessment(
      assessed({
        score: 60,
        words: [1, 2, 3, 4].map((n) => ({ word: `w${n}`, tip: 't' })),
        feedback: 'x',
      }),
    ),
    null,
  )
})
