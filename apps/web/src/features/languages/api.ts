import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import type { StudiedLanguage } from './languages'

export type LearnerLanguage = Pick<
  Database['public']['Tables']['learner_languages']['Row'],
  'language' | 'level' | 'purpose' | 'onboarded_at'
>

/** The languages the learner studies, in the order they started them. */
export async function fetchLearnerLanguages(): Promise<LearnerLanguage[]> {
  const { data, error } = await supabase
    .from('learner_languages')
    .select('language, level, purpose, onboarded_at')
    .order('created_at')
  if (error) throw error
  return data
}

/**
 * Makes a language the active one (its level and purpose are in its learner_languages row). A language studied for the first time
 * has no onboarding yet, so the app shows the first-access flow for it.
 */
export async function setActiveLanguage(language: StudiedLanguage): Promise<void> {
  const { error } = await supabase.rpc('set_active_language', { p_language: language })
  if (error) throw error
}
