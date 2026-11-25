import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, resources } from './resources'

/** Keeps <html lang> in step with the interface language (screen readers, hyphenation, spell check). */
function syncHtmlLang(language: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = language
}

i18n.on('languageChanged', syncHtmlLang)

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: Object.keys(resources[DEFAULT_LANGUAGE]),
  interpolation: { escapeValue: false },
  // Resources are bundled: init is synchronous, so the first render already has the strings.
  initAsync: false,
})

export { i18n }
