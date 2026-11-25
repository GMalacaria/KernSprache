import { supabase } from '../../lib/supabase'
import type { PracticeKind, StudyMode } from './studyMath'

export interface StudyDay {
  goal_minutes: number
  written_seconds: number
  oral_seconds: number
  completed_at: string | null
}

export async function fetchStudyDay(day: string): Promise<StudyDay | null> {
  const { data, error } = await supabase
    .from('study_days')
    .select('goal_minutes, written_seconds, oral_seconds, completed_at')
    .eq('day', day)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Review or free dialogue time: saved for statistics, never counted towards the goal. */
export async function addPracticeTime(day: string, kind: PracticeKind, seconds: number): Promise<StudyDay> {
  const { data, error } = await supabase.rpc('add_practice_time', { p_day: day, p_kind: kind, p_seconds: seconds })
  if (error) throw error
  return data
}

export async function addStudyTime(day: string, mode: StudyMode, seconds: number): Promise<StudyDay> {
  const { data, error } = await supabase.rpc('add_study_time', { p_day: day, p_mode: mode, p_seconds: seconds })
  if (error) throw error
  return data
}
