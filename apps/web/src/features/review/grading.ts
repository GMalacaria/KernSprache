import { Rating, type Grade } from 'ts-fsrs'

/** Wrong answers allowed before the solution is shown (the card is then graded "Again"). */
export const MAX_ATTEMPTS = 3

/** A right first answer within this time is "Easy" (seconds since the card was shown). */
export const EASY_WITHIN_SECONDS = { vocab: 8, sentence: 25 } as const

export type Match = 'exact' | 'typo' | 'none'

const ARTICLES = new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'l', 'del', 'della', 'dei', 'delle'])

/** Lowercase Italian words without accents, punctuation and a leading article ("l'acqua" -> "acqua"). */
export function normalizeItalian(text: string): string {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[‘’ʼ']/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length > 1 && ARTICLES.has(words[0] ?? '')) words.shift()
  return words.join(' ')
}

/** The accepted translations: the stored text split on "/", "," and ";" (e.g. "andare / camminare"). */
export function translationVariants(expected: string): string[] {
  const variants = [expected, ...expected.split(/[/,;]/)].map(normalizeItalian).filter(Boolean)
  return [...new Set(variants)]
}

export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution)
    }
    previous = current
  }
  return previous[b.length] ?? 0
}

/** Typos tolerated: none in short words, one from 4 letters, two from 9. */
function allowedTypos(length: number): number {
  if (length >= 9) return 2
  if (length >= 4) return 1
  return 0
}

/** Compares a typed translation with the stored one, ignoring case, accents, punctuation and articles. */
export function matchTranslation(expected: string, answer: string): Match {
  const typed = normalizeItalian(answer)
  if (!typed) return 'none'
  const variants = translationVariants(expected)
  if (variants.includes(typed)) return 'exact'
  return variants.some((v) => editDistance(v, typed) <= allowedTypos(v.length)) ? 'typo' : 'none'
}

export interface AnswerOutcome {
  /** Wrong answers before the right one (or before giving up). */
  wrongAttempts: number
  /** Right in the end; false when the solution was shown. */
  correct: boolean
  /** Exactly the stored solution (not a typo, a synonym or another valid correction). */
  exact: boolean
  /** Seconds from showing the card to the right answer. */
  seconds: number
  kind: keyof typeof EASY_WITHIN_SECONDS
}

/**
 * FSRS grade from how the answer went: right at once and quickly is "Easy", right at once "Good",
 * right at the second try "Hard", otherwise "Again".
 */
export function gradeAnswer({ wrongAttempts, correct, exact, seconds, kind }: AnswerOutcome): Grade {
  if (!correct || wrongAttempts >= 2) return Rating.Again
  if (wrongAttempts === 1) return Rating.Hard
  return exact && seconds <= EASY_WITHIN_SECONDS[kind] ? Rating.Easy : Rating.Good
}

/** FSRS grade from a pronunciation score (0-100) of a word read aloud. */
export function gradePronunciation(score: number): Grade {
  if (score >= 90) return Rating.Easy
  if (score >= 75) return Rating.Good
  if (score >= 55) return Rating.Hard
  return Rating.Again
}

export const GRADE_LABELS: Record<Grade, string> = {
  [Rating.Again]: 'Da rivedere',
  [Rating.Hard]: 'Con fatica',
  [Rating.Good]: 'Bene',
  [Rating.Easy]: 'Facile',
}
