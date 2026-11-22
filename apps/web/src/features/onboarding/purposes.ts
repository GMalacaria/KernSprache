import type { Database } from '../../lib/database.types'

export type LearningPurpose = Database['public']['Enums']['learning_purpose']

export const PURPOSES: { value: LearningPurpose; icon: string; label: string; hint: string }[] = [
  { value: 'leisure', icon: '🎬', label: 'Svago', hint: 'film, musica, amici, tempo libero' },
  { value: 'travel', icon: '✈️', label: 'Viaggi', hint: 'aeroporti, hotel, ristoranti, indicazioni' },
  { value: 'work', icon: '💼', label: 'Lavoro', hint: 'riunioni, email, colleghi, colloqui' },
  { value: 'love', icon: '❤️', label: 'Amore', hint: 'appuntamenti, sentimenti, famiglia' },
]

export function purposeLabel(value: LearningPurpose | null | undefined): string {
  const p = PURPOSES.find((x) => x.value === value)
  return p ? `${p.icon} ${p.label}` : 'non scelto'
}
