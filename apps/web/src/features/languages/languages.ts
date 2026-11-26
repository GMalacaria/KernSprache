import type { Database } from '../../lib/database.types'

export type LanguageCode = Database['public']['Enums']['language_code']
/** Languages that can be studied (Italian is the native and interface language). */
export type StudiedLanguage = Exclude<LanguageCode, 'it'>
export const STUDIED_LANGUAGES: StudiedLanguage[] = ['en', 'fr', 'es', 'de']

export function isStudiedLanguage(code: string | null | undefined): code is StudiedLanguage {
  return STUDIED_LANGUAGES.includes(code as StudiedLanguage)
}
