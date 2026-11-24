import type { Database } from '../../lib/database.types'
import type { EmojiName } from '../../components/Emoji'

export type LearningPurpose = Database['public']['Enums']['learning_purpose']

export const PURPOSES: { value: LearningPurpose; icon: EmojiName; label: string; hint: string }[] = [
  { value: 'leisure', icon: 'clapper', label: 'Svago', hint: 'film, musica, amici, tempo libero' },
  { value: 'travel', icon: 'airplane', label: 'Viaggi', hint: 'aeroporti, hotel, ristoranti, indicazioni' },
  { value: 'work', icon: 'briefcase', label: 'Lavoro', hint: 'riunioni, email, colleghi, colloqui' },
  { value: 'love', icon: 'heart', label: 'Amore', hint: 'appuntamenti, sentimenti, famiglia' },
]

export function purposeLabel(value: LearningPurpose | null | undefined): string {
  const p = PURPOSES.find((x) => x.value === value)
  return p ? p.label : 'non scelto'
}
