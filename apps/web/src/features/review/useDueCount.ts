import { useQuery } from '@tanstack/react-query'
import { fetchDueCount } from './api'

export function useDueCount() {
  return useQuery({ queryKey: ['review', 'due-count'], queryFn: () => fetchDueCount(new Date()) })
}
