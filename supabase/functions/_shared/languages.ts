import type { Database } from './database.types.ts'
import { z } from './deps.ts'
import type { Db } from './supabase.ts'

export type LanguageCode = Database['public']['Enums']['language_code']
export const LANGUAGE_CODES = [
  'it',
  'en',
  'fr',
  'es',
  'de',
] as const satisfies readonly LanguageCode[]
export const languageSchema = z.enum(LANGUAGE_CODES)

/** Language names as the prompts use them: the backend passes them, the model never guesses the pair. */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  it: 'Italian',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
}

/** The learner's native language (also the interface language) and the language being studied. */
export interface LanguagePair {
  native: LanguageCode
  target: LanguageCode
}

/** Names of a pair, for the fixed part of the prompts: one stable prompt prefix per pair keeps it cacheable. */
export interface PairNames {
  native: string
  target: string
}

export function pairNames(pair: LanguagePair): PairNames {
  return {
    native: LANGUAGE_NAMES[pair.native],
    target: LANGUAGE_NAMES[pair.target],
  }
}

/** What the backend knows about the learner in one language. */
export interface Learner {
  pair: LanguagePair
  level: Database['public']['Enums']['cefr_level']
  purpose: Database['public']['Enums']['learning_purpose'] | null
  goal: string | null
}

/**
 * The learner in `language` (by default the active one): level, purpose and details from learner_languages,
 * falling back to the profile for a learner who has no row yet. Runs under RLS.
 */
export async function loadLearner(
  db: Db,
  userId: string,
  language?: LanguageCode,
): Promise<Learner> {
  const { data: profile, error } = await db
    .from('profiles')
    .select('native_language, active_language, level, purpose, goal')
    .eq('id', userId)
    .single()
  if (error) throw error
  const target = language ?? profile.active_language
  const { data: row, error: rowError } = await db
    .from('learner_languages')
    .select('level, purpose, goal')
    .eq('user_id', userId)
    .eq('language', target)
    .maybeSingle()
  if (rowError) throw rowError
  const source = row ?? profile
  return {
    pair: { native: profile.native_language, target },
    level: source.level,
    purpose: source.purpose,
    goal: source.goal,
  }
}
