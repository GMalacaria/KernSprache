import type { LessonContent } from './types'

export interface DictationSentence {
  en: string
  it: string
}

export const MAX_DICTATION_SENTENCES = 3
const MIN_WORDS = 3
const MAX_WORDS = 12

/** Points a sentence loses for each wrong attempt and for looking at the text. */
export const WRONG_ATTEMPT_PENALTY = 20
export const TEXT_SHOWN_PENALTY = 30

/** Lowercase words without punctuation; apostrophes inside words are kept (I'm, don't). */
export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '').replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 0)
}

export interface TypedWord {
  /** The word as the learner typed it. */
  word: string
  ok: boolean
}

export interface DictationComparison {
  correct: boolean
  /** The attempt word by word, each marked right or wrong. */
  words: TypedWord[]
  /** Words of the sentence that the attempt does not have. */
  missing: number
}

/**
 * Compares an attempt with the sentence, ignoring case and punctuation. Words are matched in order
 * (longest common subsequence), so one extra or missing word does not mark everything after it wrong.
 */
export function compareDictation(target: string, attempt: string): DictationComparison {
  const expected = normalizeWords(target)
  const typed = attempt.trim().split(/\s+/).filter(Boolean)
  const normalizedTyped = typed.map((w) => normalizeWords(w)[0] ?? '')

  // lcs(i, j): length of the longest common subsequence of expected[i..] and normalizedTyped[j..].
  const width = typed.length + 1
  const table = new Array<number>((expected.length + 1) * width).fill(0)
  const lcs = (i: number, j: number) => table[i * width + j] ?? 0
  for (let i = expected.length - 1; i >= 0; i--) {
    for (let j = typed.length - 1; j >= 0; j--) {
      table[i * width + j] =
        expected[i] === normalizedTyped[j] ? lcs(i + 1, j + 1) + 1 : Math.max(lcs(i + 1, j), lcs(i, j + 1))
    }
  }

  const matched = new Set<number>()
  for (let i = 0, j = 0; i < expected.length && j < typed.length; ) {
    if (expected[i] === normalizedTyped[j]) {
      matched.add(j)
      i++
      j++
    } else if (lcs(i + 1, j) >= lcs(i, j + 1)) i++
    else j++
  }

  const words = typed.map((word, j) => ({ word, ok: matched.has(j) }))
  const missing = expected.length - matched.size
  return { correct: missing === 0 && words.every((w) => w.ok) && words.length > 0, words, missing }
}

/** Score of one sentence, 0-100: wrong attempts and reading the text take points off. */
export function dictationScore(wrongAttempts: number, textShown: boolean): number {
  return Math.max(0, 100 - wrongAttempts * WRONG_ATTEMPT_PENALTY - (textShown ? TEXT_SHOWN_PENALTY : 0))
}

/** Short sentences from the lesson (expressions first, then grammar examples), at most three. */
export function dictationSentences(content: LessonContent): DictationSentence[] {
  const candidates: DictationSentence[] = [
    ...content.phrases.map((p) => ({ en: p.en, it: p.it })),
    ...content.grammar.examples.map((e) => ({ en: e.en, it: e.it })),
  ]
  const seen = new Set<string>()
  const picked: DictationSentence[] = []
  for (const sentence of candidates) {
    const key = normalizeWords(sentence.en).join(' ')
    const count = normalizeWords(sentence.en).length
    if (count < MIN_WORDS || count > MAX_WORDS || seen.has(key)) continue
    seen.add(key)
    picked.push(sentence)
    if (picked.length === MAX_DICTATION_SENTENCES) break
  }
  return picked
}
