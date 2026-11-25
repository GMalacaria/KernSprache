import itAuth from './locales/it/auth.json'
import itCommon from './locales/it/common.json'
import itHome from './locales/it/home.json'
import itOnboarding from './locales/it/onboarding.json'
import itPath from './locales/it/path.json'
import itProfile from './locales/it/profile.json'
import itSettings from './locales/it/settings.json'
import itStudy from './locales/it/study.json'

/** Interface strings by language: one JSON per feature (namespace). The interface language is the native one. */
export const resources = {
  it: {
    common: itCommon,
    auth: itAuth,
    onboarding: itOnboarding,
    home: itHome,
    path: itPath,
    profile: itProfile,
    settings: itSettings,
    study: itStudy,
  },
} as const

export type InterfaceLanguage = keyof typeof resources
export const DEFAULT_LANGUAGE: InterfaceLanguage = 'it'
