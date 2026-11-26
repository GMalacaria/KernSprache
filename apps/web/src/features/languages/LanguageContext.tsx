import { useEffect, type ReactNode } from 'react'
import { setSpeechLanguage } from '../../lib/audio'
import type { StudiedLanguage } from './languages'
import { LanguageContext } from './useLanguage'

/** Makes the studied language available to the screens and sets it for the voice. */
export function LanguageProvider({ language, children }: { language: StudiedLanguage; children: ReactNode }) {
  useEffect(() => setSpeechLanguage(language), [language])
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>
}
