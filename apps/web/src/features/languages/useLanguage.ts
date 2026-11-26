import { createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import type { StudiedLanguage } from './languages'

export const LanguageContext = createContext<StudiedLanguage>('en')

/** The language being studied, for `lang` attributes, the voice and texts like "in inglese". */
export function useStudiedLanguage(): StudiedLanguage {
  return useContext(LanguageContext)
}

/** Names of the studied language for the interface: "Tedesco", "tedesco", "il tedesco", and a placeholder in it. */
export function useLanguageNames() {
  const language = useStudiedLanguage()
  const { t } = useTranslation()
  return {
    code: language,
    name: t(`languages.${language}.name`),
    lower: t(`languages.${language}.lower`),
    the: t(`languages.${language}.the`),
    writeHere: t(`languages.${language}.writeHere`),
  }
}
