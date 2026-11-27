import type { LanguageCode } from '../languages.ts'
import { EN_BANK } from './bank/en.ts'
import type { PlacementBank } from './bank/types.ts'

export * from './bank/types.ts'

/** Skill-tagged banks of the adaptive placement test. A language without one keeps the fixed test (questions.ts). */
export const PLACEMENT_BANKS: Partial<Record<LanguageCode, PlacementBank>> = {
  en: EN_BANK,
}

export function placementBank(language: LanguageCode): PlacementBank | null {
  return PLACEMENT_BANKS[language] ?? null
}
