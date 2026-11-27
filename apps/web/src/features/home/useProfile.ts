import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * The learner as the screens need it: the profile (approval, reminders, daily goal, languages) plus level, purpose,
 * details and onboarding of the language being studied, which live in learner_languages. A language without a row
 * yet is just starting: A1, no purpose, not onboarded.
 */
export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('approved, reminder_time, timezone, daily_goal_minutes, active_language, native_language')
        .eq('id', userId)
        .single()
      if (error) throw error
      const { data: row, error: rowError } = await supabase
        .from('learner_languages')
        .select('level, purpose, goal, onboarded_at')
        .eq('user_id', userId)
        .eq('language', profile.active_language)
        .maybeSingle()
      if (rowError) throw rowError
      return {
        ...profile,
        level: row?.level ?? ('A1' as const),
        purpose: row?.purpose ?? null,
        goal: row?.goal ?? null,
        onboarded_at: row?.onboarded_at ?? null,
      }
    },
  })
}
