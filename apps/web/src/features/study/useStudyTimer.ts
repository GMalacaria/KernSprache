import { createContext, useContext, useEffect } from 'react'
import type { ActivityKind, PracticeKind, StudyMode, StudyStatus } from './studyMath'

export interface StudyTimer {
  day: string
  /** Profile and today's progress are loaded. */
  ready: boolean
  goalSeconds: number
  writtenSeconds: number
  oralSeconds: number
  status: StudyStatus
  /** Half of the goal being studied on screen (lesson, chapter test); null elsewhere, practice included. */
  activeMode: StudyMode | null
  /** The clock is running right now. */
  isCounting: boolean
  /** Prompt to switch to oral after the written half. */
  showHalfwayPrompt: boolean
  /** Goal reached: the activity is paused until the learner asks to continue. */
  showGoalReached: boolean
  setActiveMode: (kind: ActivityKind | null) => void
  markActivity: () => void
  dismissHalfwayPrompt: () => void
  continueAfterGoal: () => void
}

export const StudyTimerContext = createContext<StudyTimer | null>(null)

export function useStudyTimer(): StudyTimer {
  const ctx = useContext(StudyTimerContext)
  if (!ctx) throw new Error('useStudyTimer must be used inside StudyTimerProvider')
  return ctx
}

/** Declares the half of the goal the screen is studying (lessons and chapter tests) while it is mounted. */
export function useStudyActivity(mode: StudyMode): StudyTimer {
  const timer = useStudyTimer()
  const { setActiveMode } = timer
  useEffect(() => {
    setActiveMode(mode)
    return () => setActiveMode(null)
  }, [mode, setActiveMode])
  return timer
}

/**
 * Declares extra practice on screen (review, free dialogue): its active time is saved per day for
 * statistics but never counts towards the daily goal. Pass null while the practice has not started.
 */
export function usePracticeActivity(kind: PracticeKind | null): StudyTimer {
  const timer = useStudyTimer()
  const { setActiveMode } = timer
  useEffect(() => {
    setActiveMode(kind)
    return () => setActiveMode(null)
  }, [kind, setActiveMode])
  return timer
}
