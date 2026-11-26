import { useQuery } from '@tanstack/react-query'
import { useStudiedLanguage } from '../languages/useLanguage'
import { fetchDueCount } from './api'

export function useDueCount() {
  const language = useStudiedLanguage()
  return useQuery({ queryKey: ['review', 'due-count', language], queryFn: () => fetchDueCount(new Date(), language) })
}
