import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLearnerLanguages, setActiveLanguage } from './api'

export function useLearnerLanguages() {
  return useQuery({ queryKey: ['learner-languages'], queryFn: fetchLearnerLanguages })
}

/** Switches the active language; every query is refreshed, since almost all of them depend on it. */
export function useSwitchLanguage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setActiveLanguage,
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
