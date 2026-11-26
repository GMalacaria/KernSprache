import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('approved, level, goal, purpose, onboarded_at, reminder_time, timezone, daily_goal_minutes, active_language')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
  })
}
