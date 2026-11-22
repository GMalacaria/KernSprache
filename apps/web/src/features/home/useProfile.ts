import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('level, goal, reminder_time, timezone')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
  })
}
