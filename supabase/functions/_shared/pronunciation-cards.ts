import type { LanguageCode } from './languages.ts'
import type { Pronunciation } from './schemas/pronunciation.ts'
import type { Db } from './supabase.ts'

/**
 * Above this score every word was clear (the prompt keeps scores over 85 for that), so the
 * listed words are only nitpicks and do not become review cards.
 */
export const MAX_SCORE_FOR_CARDS = 85

export interface PronunciationCard {
  original: string
  corrected: string
  explanation: string
  category: 'pronunciation'
}

/** Lowercase word without surrounding punctuation, used to spot duplicates. */
export function cardKey(word: string): string {
  return word.trim().toLowerCase().replace(
    /^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu,
    '',
  )
}

/** New review cards for the words of an assessment, skipping words the learner already has as cards. Pure. */
export function pronunciationCards(
  pronunciation: Pronunciation | null,
  existing: Iterable<string>,
): PronunciationCard[] {
  if (!pronunciation || pronunciation.score > MAX_SCORE_FOR_CARDS) return []
  const seen = new Set([...existing].map(cardKey))
  const cards: PronunciationCard[] = []
  for (const { word, tip } of pronunciation.words) {
    const key = cardKey(word)
    if (!key || seen.has(key)) continue
    seen.add(key)
    const clean = word.trim()
    cards.push({
      original: clean,
      corrected: clean,
      explanation: tip.trim(),
      category: 'pronunciation',
    })
  }
  return cards
}

/** Stores the mispronounced words as review cards. Never throws: saving cards must not lose the transcript. */
export async function savePronunciationCards(
  db: Db,
  userId: string,
  pronunciation: Pronunciation | null,
  language: LanguageCode,
): Promise<void> {
  if (
    !pronunciation?.words.length || pronunciation.score > MAX_SCORE_FOR_CARDS
  ) return
  const { data, error } = await db
    .from('mistakes')
    .select('original')
    .eq('user_id', userId)
    .eq('category', 'pronunciation')
    .eq('language', language)
  if (error) {
    console.error('Failed to read pronunciation cards', error)
    return
  }
  const cards = pronunciationCards(pronunciation, data.map((m) => m.original))
  if (!cards.length) return
  const { error: insertError } = await db.from('mistakes').insert(
    cards.map((card) => ({ ...card, language })),
  )
  if (insertError) {
    console.error('Failed to save pronunciation cards', insertError)
  }
}
