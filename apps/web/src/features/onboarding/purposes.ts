import type { Database } from '../../lib/database.types'
import type { EmojiName } from '../../components/Emoji'
import { i18n } from '../../i18n'

export type LearningPurpose = Database['public']['Enums']['learning_purpose']

/** The purposes in display order; label and hint are in the `onboarding` catalog under `purposes.<value>`. */
export const PURPOSES: { value: LearningPurpose; icon: EmojiName }[] = [
  { value: 'leisure', icon: 'clapper' },
  { value: 'travel', icon: 'airplane' },
  { value: 'work', icon: 'briefcase' },
  { value: 'love', icon: 'heart' },
]

export function purposeLabel(value: LearningPurpose | null | undefined): string {
  const t = i18n.getFixedT(null, 'onboarding')
  return value ? t(`purposes.${value}.label`) : t('purposes.none')
}

export function purposeHint(value: LearningPurpose): string {
  return i18n.t(`purposes.${value}.hint`, { ns: 'onboarding' })
}
