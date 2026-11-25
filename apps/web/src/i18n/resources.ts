import itAuth from './locales/it/auth.json'
import itCommon from './locales/it/common.json'
import itOnboarding from './locales/it/onboarding.json'

/** Interface strings by language: one JSON per feature (namespace). The interface language is the native one. */
export const resources = {
  it: {
    common: itCommon,
    auth: itAuth,
    onboarding: itOnboarding,
  },
} as const

export type InterfaceLanguage = keyof typeof resources
export const DEFAULT_LANGUAGE: InterfaceLanguage = 'it'
