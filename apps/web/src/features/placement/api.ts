import { i18n } from '../../i18n'
import { functionErrorMessage } from '../../lib/functionError'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'

export type CefrLevel = Database['public']['Enums']['cefr_level']

export interface PlacementQuestion {
  id: string
  level: CefrLevel
  prompt: string
  options: string[]
}

export interface OralPrompt {
  id: string
  level: CefrLevel
  prompt_it: string
}

export interface PlacementResult {
  written: { correct: number; total: number; level: CefrLevel }
  oral: { level: CefrLevel; feedback_it: string; strengths_it: string[]; to_improve_it: string[] } | null
  final_level: CefrLevel
}

async function invoke<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('placement-test', { body })
  if (error) throw new Error(await functionErrorMessage(error, i18n.t('placement.error', { ns: 'tests' })))
  if (!data) throw new Error(i18n.t('errors.emptyResponse'))
  return data
}

export function startPlacement() {
  return invoke<{ questions: PlacementQuestion[]; oral_prompts: OralPrompt[] }>({ action: 'start' })
}

export function submitPlacement(answers: Record<string, number>, oral: { id: string; transcript: string }[]) {
  return invoke<PlacementResult>({ action: 'submit', answers, oral })
}

/** Skipping the test on first run: keep A1 and finish onboarding. */
export async function skipPlacement(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', userId)
  if (error) throw error
}
