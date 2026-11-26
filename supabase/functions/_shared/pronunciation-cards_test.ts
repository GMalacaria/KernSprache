import { assertEquals } from 'jsr:@std/assert@1'
import { MAX_SCORE_FOR_CARDS, pronunciationCards } from './pronunciation-cards.ts'

const assessment = (score: number, words: string[]) => ({
  score,
  feedback: 'Cura la "th".',
  words: words.map((word) => ({ word, tip: `Consiglio per ${word}` })),
})

Deno.test('pronunciation cards: one card per word, the word is both original and corrected', () => {
  const cards = pronunciationCards(assessment(60, ['think', 'world']), [])
  assertEquals(cards, [
    {
      original: 'think',
      corrected: 'think',
      explanation_it: 'Consiglio per think',
      category: 'pronunciation',
    },
    {
      original: 'world',
      corrected: 'world',
      explanation_it: 'Consiglio per world',
      category: 'pronunciation',
    },
  ])
})

Deno.test('pronunciation cards: skip words already in review, ignoring case and punctuation', () => {
  const cards = pronunciationCards(
    assessment(60, ['Think,', 'world', 'WORLD']),
    ['think'],
  )
  assertEquals(cards.map((c) => c.original), ['world'])
})

Deno.test('pronunciation cards: none when every word was clear or there is no assessment', () => {
  assertEquals(
    pronunciationCards(assessment(MAX_SCORE_FOR_CARDS + 1, ['think']), []),
    [],
  )
  assertEquals(
    pronunciationCards(assessment(MAX_SCORE_FOR_CARDS, ['think']), []).length,
    1,
  )
  assertEquals(pronunciationCards(null, []), [])
})
